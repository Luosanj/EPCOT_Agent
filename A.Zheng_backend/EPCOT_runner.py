import sys
import os
import json
from datetime import datetime

sys.path.append(
    "/nfs/turbo/umms-drjieliu/usr/luosanj/EPCOTv2_gradio/EPCOTv2/"
)

import torch
import numpy as np
import pickle
from curriculum.lora_prompt_model import build_model
from erna.util import load_ref_genome, load_dnase


# =====================================================
# Device
# =====================================================

device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")


# =====================================================
# Model Args
# =====================================================

class DefaultArg:
    def __init__(self):
        self.bins = 600
        self.crop = 50
        self.embed_dim = 960
        self.epochs = 20
        self.accum_iter = 2
        self.lr = 1e-5
        self.batchsize = 1
        self.atac_block = True
        self.full = False
        self.lora_r_pretrain = 0
        self.lora_r_pretrain_1 = 0
        self.lora_trunk_r = 0
        self.lora_head_epi_r = 0
        self.lora_head_rna_r = 0
        self.lora_head_erna_r = 0
        self.lora_head_microc_r = 0
        self.logits_type = 'dilate'
        self.prefix = ''
        self.prompt = False
        self.teacher = False
        self.external = True
        self.out = ''
        self.include_scatac = False
        self.seq_specific = False


# =====================================================
# Load Model (FP16)
# =====================================================

args = DefaultArg()
model = build_model(args)

MODEL_PATH = "/nfs/turbo/umms-drjieliu/usr/luosanj/EPCOTv2_gradio/EPCOTv2/models/human_model.pt"

ckpt = torch.load(MODEL_PATH, map_location="cpu")
model.load_state_dict(ckpt.get("state_dict", ckpt))

model = model.to(device).half()   # FULL FP16
model.eval()


# =====================================================
# Map arbitrary user region to 600kb windows
# =====================================================

def map_user_region(chromosome, start, end):

    region_file = "/nfs/turbo/umms-drjieliu/usr/luosanj/EPCOTv2_gradio/EPCOTv2/erna/input_region_600kb.bed"

    input_locs = np.loadtxt(region_file, dtype=str, delimiter="\t")
    input_locs[:, 0] = np.char.replace(input_locs[:, 0], "chr", "")

    locas_chrom = input_locs[input_locs[:, 0] == str(chromosome)]

    starts = locas_chrom[:, 1].astype(int)
    ends   = locas_chrom[:, 2].astype(int)

    overlap_mask = (ends > start) & (starts < end)

    aligned_windows = locas_chrom[overlap_mask]

    if len(aligned_windows) == 0:
        raise Exception("No overlapping EPCOT windows found for this region.")

    window_start = int(aligned_windows[0][1])

    return aligned_windows, window_start


# =====================================================
# Crop output to exact user region
# =====================================================

def crop_prediction(pred_array, window_start, user_start, user_end):

    start_offset = (user_start - window_start) // 1000
    end_offset   = (user_end   - window_start) // 1000

    return pred_array[:, start_offset:end_offset]


# =====================================================
# Get supported genomic coverage
# =====================================================

def get_supported_range(chromosome):

    region_file = "/nfs/turbo/umms-drjieliu/usr/luosanj/EPCOTv2_gradio/EPCOTv2/erna/input_region_600kb.bed"

    input_locs = np.loadtxt(region_file, dtype=str, delimiter="\t")
    input_locs[:, 0] = np.char.replace(input_locs[:, 0], "chr", "")

    chromosome = str(chromosome).replace("chr", "")

    locas_chrom = input_locs[input_locs[:, 0] == chromosome]

    if len(locas_chrom) == 0:
        return None

    starts = locas_chrom[:, 1].astype(int)
    ends   = locas_chrom[:, 2].astype(int)

    return {
        "min_start": int(np.min(starts)),
        "max_end": int(np.max(ends))
    }


# =====================================================
# Main Prediction Function (FP16 Safe)
# =====================================================

def run_epcot_prediction(bam_path, chromosome, start, end, modalities):

    torch.cuda.empty_cache()

    # -------------------------------------------------
    # Load ATAC (convert to FP16 immediately)
    # -------------------------------------------------

    atac_pickle_file = "/nfs/turbo/umms-drjieliu/usr/luosanj/EPCOTv2/atac_bw/A549_atac.pickle"

    with open(atac_pickle_file, "rb") as f:
        atacseq = pickle.load(f)

    ref_data = load_ref_genome(chromosome).half()
    atac_data = load_dnase(
        atacseq[chromosome].astype("float32")
    ).half()

    # -------------------------------------------------
    # Map user region to valid 600kb windows
    # -------------------------------------------------

    aligned_windows, window_start = map_user_region(
        chromosome, start, end
    )

    # -------------------------------------------------
    # Build batch inputs (FP16)
    # -------------------------------------------------

    batch_inputs = []

    for window in aligned_windows:
        chrom, s, e = window
        inp_s = int(s) // 1000
        inp_e = int(e) // 1000

        input_tensor = torch.cat(
            (ref_data[inp_s:inp_e], atac_data[inp_s:inp_e]),
            dim=1
        ).unsqueeze(0)

        batch_inputs.append(input_tensor)

    batch_inputs = torch.cat(batch_inputs, dim=0)
    batch_inputs = batch_inputs.to(device).half()

    # -------------------------------------------------
    # Run Model (AMP protected FP16)
    # -------------------------------------------------

    with torch.no_grad():
        with torch.cuda.amp.autocast(dtype=torch.float16):
            output, external_output = model(batch_inputs)

    mix_output = [
        out.cpu().float().numpy()   # convert back to float32 for safe numpy ops
        for out in (output + external_output)
    ]

    all_modalities = [
        'epi', 'rna', 'bru', 'microc', 'hic',
        'intacthic', 'rna_strand', 'external_tf',
        'tt', 'groseq', 'grocap', 'proseq',
        'netcage', 'starr'
    ]

    out_dict = dict(zip(all_modalities, mix_output))

    # -------------------------------------------------
    # Crop to exact user region
    # -------------------------------------------------

    selected_outputs = {}

    for mod in modalities:
        if mod in out_dict:
            cropped = crop_prediction(
                out_dict[mod],
                window_start,
                start,
                end
            )
            selected_outputs[mod] = cropped.tolist()

    # -------------------------------------------------
    # Add metadata
    # -------------------------------------------------

    selected_outputs["metadata"] = {
        "chromosome": chromosome,
        "start": start,
        "end": end,
        "modalities": modalities,
        "bam_file": bam_path,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    # -------------------------------------------------
    # Save JSON
    # -------------------------------------------------

    output_dir = "prediction_outputs"
    os.makedirs(output_dir, exist_ok=True)

    filename = f"prediction_chr{chromosome}_{start}_{end}.json"
    filepath = os.path.join(output_dir, filename)

    with open(filepath, "w") as f:
        json.dump(selected_outputs, f)

    return {
        "file_path": filepath,
        "modalities": list(selected_outputs.keys())
    }