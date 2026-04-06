import sys
import os
import json
from datetime import datetime
import matplotlib.pyplot as plt
from mpl_toolkits.axes_grid1 import make_axes_locatable
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

        if mod not in out_dict:
            continue

        pred = out_dict[mod]

        start_offset = int((start - window_start) / 1000)
        end_offset   = int(np.ceil((end - window_start) / 1000))

        # 2D contact maps
        if mod in ["microc", "hic", "intacthic"]:

            cropped = pred[:, 
                        start_offset:end_offset,
                        start_offset:end_offset,
                        :]

        # 1D tracks
        else:
            cropped = pred[:, start_offset:end_offset]

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

    mod = modalities[0]

    filename = f"{mod}_chr{chromosome}_{start}_{end}.json"
    filepath = os.path.join(output_dir, filename)

    with open(filepath, "w") as f:
        json.dump(selected_outputs, f)

    # -------------------------------------------------
    # Generate plots
    # -------------------------------------------------

    return {
    "modality": modalities[0],
    "file_path": filepath,
    }

# =====================================================
# Plot predictions
# =====================================================

def plot_epcot_predictions(prediction_file, save_dir="prediction_plots"):

    os.makedirs(save_dir, exist_ok=True)

    with open(prediction_file, "r") as f:
        pred_data = json.load(f)

    chrom = pred_data["metadata"]["chromosome"]
    chromosome = str(chrom).replace("chr", "")

    start = pred_data["metadata"]["start"]
    end   = pred_data["metadata"]["end"]
    modalities = pred_data["metadata"]["modalities"]

    saved_plots = []

    for mod in modalities:

        if mod not in pred_data:
            continue

        data = np.array(pred_data[mod])

        # =============================
        # 2D contact maps
        # =============================
        if mod in ["microc", "hic", "intacthic"]:

            data = np.squeeze(data)

            if mod == "microc":
                data = data[:, :, 0]
            elif mod == "hic":
                data = data[:, :, 2]
            elif mod == "intacthic":
                data = data[:, 1]

            fig, ax = plt.subplots(figsize=(6, 6))

            im = ax.imshow(
                data,
                cmap="RdBu_r",
                vmin=0,
                vmax=2,
                extent=[start, end, start, end]
            )

            divider = make_axes_locatable(ax)
            cax = divider.append_axes("right", size="5%", pad=0.05)
            plt.colorbar(im, cax=cax)

            ax.set_title(mod)

        # =============================
        # 1D tracks (FIXED)
        # =============================
        else:

            data = np.squeeze(data)

            if mod == "rna" and data.ndim == 2:
                data = data[:, 2]

            if mod in ["bru","rna_strand","tt","groseq","grocap","proseq","netcage"] and data.ndim == 2:
                data = data[:, 0]

            # coords per modality
            n_bins = data.shape[0]
            pixel_width = (end - start) / n_bins
            coords = start + pixel_width/2 + np.arange(n_bins) * pixel_width

            fig, ax = plt.subplots(figsize=(8, 2))

            sig = np.clip(data, 0, None)

            ax.plot(coords, sig, lw=1.5)
            ax.fill_between(coords, 0, sig, alpha=0.3)

            ax.set_xlim(coords.min(), coords.max())
            ax.set_title(mod)

            for spine in ax.spines.values():
                spine.set_visible(False)

        plt.tight_layout()

        plot_path = f"{save_dir}/{mod}_chr{chromosome}_{start}_{end}.png"
        plt.savefig(plot_path, dpi=300)
        plt.close()

        saved_plots.append(plot_path)

    return saved_plots

def plot_all_modalities_stacked(pred_data, save_path):

    chrom = pred_data["metadata"]["chromosome"]
    start = pred_data["metadata"]["start"]
    end   = pred_data["metadata"]["end"]
    modalities = pred_data["metadata"]["modalities"]

    tracks = []

    # -----------------------------
    # Collect valid 1D tracks
    # -----------------------------
    for mod in modalities:

        if mod not in pred_data:
            continue

        if mod in ["microc", "hic", "intacthic"]:
            continue

        data = np.array(pred_data[mod])
        data = np.squeeze(data)

        if mod == "rna" and data.ndim == 2:
            data = data[:, 2]

        if mod in ["bru","rna_strand","tt","groseq","grocap","proseq","netcage"] and data.ndim == 2:
            data = data[:, 0]

        tracks.append((mod, data))

    if len(tracks) == 0:
        return None

    # -----------------------------
    # Create stacked plot
    # -----------------------------
    n_tracks = len(tracks)

    fig, axes = plt.subplots(
        n_tracks, 1,
        figsize=(10, 1.5 * n_tracks),
        sharex=False   # 🔥 important fix
    )

    if n_tracks == 1:
        axes = [axes]

    for i, (mod, data) in enumerate(tracks):

        ax = axes[i]

        # FIX: per-track coords
        n_bins = data.shape[0]
        pixel_width = (end - start) / n_bins
        coords = start + pixel_width/2 + np.arange(n_bins) * pixel_width

        sig = np.clip(data, 0, None)

        ax.plot(coords, sig, lw=1)
        ax.fill_between(coords, 0, sig, alpha=0.3)

        ax.set_xlim(start, end)
        ax.set_ylabel(mod, rotation=0, labelpad=30, fontsize=8)

        for spine in ax.spines.values():
            spine.set_visible(False)

        ax.tick_params(left=False)

        if i != n_tracks - 1:
            ax.tick_params(labelbottom=False)

    axes[-1].set_xlabel(f"chr{chrom}: {start}-{end}")

    plt.tight_layout()
    plt.savefig(save_path, dpi=300)
    plt.close()

    return save_path

def plot_all_modalities_2d(pred_data, save_path):

    chrom = pred_data["metadata"]["chromosome"]
    start = pred_data["metadata"]["start"]
    end   = pred_data["metadata"]["end"]
    modalities = pred_data["metadata"]["modalities"]

    modalities_2d = ["microc", "hic", "intacthic"]

    tracks_2d = [mod for mod in modalities_2d if mod in modalities and mod in pred_data]

    if not tracks_2d:
        return None

    n = len(tracks_2d)
    fig, axes = plt.subplots(1, n, figsize=(6 * n, 5))

    if n == 1:
        axes = [axes]

    for ax, mod in zip(axes, tracks_2d):

        data = np.array(pred_data[mod])
        data = np.squeeze(data)

        if mod == "microc":
            mat = data[:, :, 0]
        elif mod == "hic":
            mat = data[:, :, 2]
        elif mod == "intacthic":
            mat = data[:, 1]

        im = ax.imshow(
            mat,
            cmap="RdBu_r",
            vmin=0,
            vmax=2,
            aspect="auto",
            extent=[start, end, end, start]
        )

        divider = make_axes_locatable(ax)
        cax = divider.append_axes("right", size="5%", pad=0.05)
        plt.colorbar(im, cax=cax)

        ax.set_title(mod)

    plt.tight_layout()
    plt.savefig(save_path, dpi=300)
    plt.close()

    return save_path

def combine_json_to_pickle(output_dir="prediction_outputs", requested_modalities=None):
    """
    Combines all prediction JSON files in output_dir into a single pickle file.
    Only includes modalities that were actually requested in the current session.
    """
    combined = {}
    merged_modalities = []
    last_metadata = None

    for filename in os.listdir(output_dir):
        if not filename.endswith(".json"):
            continue

        filepath = os.path.join(output_dir, filename)

        with open(filepath, "r") as f:
            data = json.load(f)

        for mod in data["metadata"]["modalities"]:
            if requested_modalities and mod not in requested_modalities:
                continue
            if mod in data:
                combined[mod] = data[mod]
                if mod not in merged_modalities:
                    merged_modalities.append(mod)

        last_metadata = data["metadata"]

    if not combined:
        print("[WARNING] No matching modalities found in", output_dir)
        return None

    # Rebuild clean metadata with only requested modalities
    combined["metadata"] = {
        "chromosome": last_metadata["chromosome"],
        "start": last_metadata["start"],
        "end": last_metadata["end"],
        "modalities": merged_modalities,
        "bam_file": last_metadata.get("bam_file", ""),
        "timestamp": last_metadata.get("timestamp", "")
    }

    # Unique filename: modalities + region + timestamp
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    chrom = last_metadata["chromosome"]
    start = last_metadata["start"]
    end = last_metadata["end"]
    mods_str = "_".join(merged_modalities)

    pickle_filename = f"predictions_{mods_str}_chr{chrom}_{start}_{end}_{timestamp_str}.pkl"
    pickle_path = os.path.join(output_dir, pickle_filename)

    with open(pickle_path, "wb") as f:
        pickle.dump(combined, f)

    print(f"[INFO] Saved combined pickle to: {pickle_path}")
    print(f"[INFO] Modalities included: {merged_modalities}")

    return pickle_path