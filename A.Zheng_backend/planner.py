import os
import json
from EPCOT_runner import (
    run_epcot_prediction,
    get_supported_range,
    plot_all_modalities_stacked,
    plot_all_modalities_2d,
    combine_json_to_pickle
)


class LLMGenomicPlanner:

    def __init__(self):

        self.modalities = {
            "epi": "epigenomes.txt",
            "rna": ["CAGE-seq", "Total RNA-seq", "PolyA+ RNA-seq"],
            "bru": ["Bru-seq", "BruUV-seq", "BruChase-seq"],
            "microc": ["O/E normalized Micro-C", "KR normalized Micro-C"],
            "hic": ["CTCF ChIA-PET", "RNApol2 ChIA-PET", "Hi-C"],
            "intacthic": ["O/E normalized intact Hi-C", "KR normalized intact Hi-C"],
            "rna_strand": ["Total RNA-seq (forward)", "Total RNA-seq (reverse)"],
            "external_tf": "unseeen_tf.txt",
            "tt": ["TT-seq (forward)", "TT-seq (reverse)"],
            "groseq": ["GRO-seq (forward)", "GRO-seq (reverse)"],
            "grocap": [
                "GRO-cap (forward)", "GRO-cap (reverse)",
                "GRO-cap_wTAP (forward)", "GRO-cap_wTAP (reverse)"
            ],
            "proseq": ["PRO-seq (forward)", "PRO-seq (reverse)", "PRO-cap"],
            "netcage": ["NET-CAGE (forward)", "NET-CAGE (reverse)"],
            "starr": ["STARR-seq"]
        }

        self.modalities_2d = {"microc", "hic"}

    # ===============================
    # Extract genomic region
    # ===============================
    def extract_genomic_region(self, text):

        parts = [p.strip() for p in text.split(",")]

        if len(parts) != 3:
            return "invalid_format"

        chromosome_id, start_pos, end_pos = parts

        if not chromosome_id.startswith("chr"):
            return "invalid_format"

        if not start_pos.isdigit() or not end_pos.isdigit():
            return "invalid_format"

        start_pos = int(start_pos)
        end_pos = int(end_pos)

        if start_pos >= end_pos:
            return "invalid_range"

        if (end_pos - start_pos) > 600000:
            return "region_too_large"

        return {
            "chromosome_id": chromosome_id,
            "start_pos": start_pos,
            "end_pos": end_pos
        }

    # ===============================
    # Chat logic
    # ===============================

    def chat(self, message, state):

        if state is None:
            state = {}

        state.setdefault("stage", "start")
        state.setdefault("bam_file", None)
        state.setdefault("genomic_region", None)
        state.setdefault("selected_modalities", [])

        # ===============================
        # Stage 1: Start
        # ===============================
        if state["stage"] == "start":
            state["stage"] = "awaiting_bam"
            return (
                "Hi! I'm EPCOT Assistant.\n\n"
                "Please upload your chromatin accessibility (.bam) file."
            )

        # ===============================
        # Stage 2: Await BAM
        # ===============================
        if state["stage"] == "awaiting_bam":

            if not state.get("bam_file"):
                return "Please upload a valid .bam file."

            state["stage"] = "awaiting_region"
            return (
                "BAM file received.\n\n"
                "Provide genomic region:\n"
                "chr1, 100000, 200000"
            )

        # ===============================
        # Stage 3: Region
        # ===============================
        if state["stage"] == "awaiting_region":

            region = self.extract_genomic_region(message.strip())

            if region == "invalid_format":
                return "Invalid format. Example: chr1, 100000, 200000"

            if region == "invalid_range":
                return "Start must be smaller than end."

            if region == "region_too_large":
                return "Region must be ≤ 600,000 bp."

            chrom = region["chromosome_id"].replace("chr", "")
            start = region["start_pos"]
            end = region["end_pos"]

            supported = get_supported_range(chrom)

            if supported is None:
                return f"No EPCOT support for chr{chrom}"

            if start < supported["min_start"] or end > supported["max_end"]:
                return (
                    f"Out of supported range.\n"
                    f"chr{chrom}: {supported['min_start']} - {supported['max_end']}"
                )

            state["genomic_region"] = region
            state["stage"] = "awaiting_modality"

            return (
                f"Region OK: chr{chrom}:{start}-{end}\n\n"
                "What would you like to predict?"
            )

        # ===============================
        # Stage 4: Modality (FIXED SAFE)
        # ===============================
        if state["stage"] == "awaiting_modality":

            text = message.lower().strip()

            # ALWAYS define selected first
            selected = []

            # ---- split input like "epi, bru"
            requested = [m.strip() for m in text.split(",")]

            supported = set(self.modalities.keys())

            # ---- direct matching
            selected = [m for m in requested if m in supported]

            # ---- fallback NLP matching
            if not selected:

                if "rna" in text or "expression" in text:
                    selected.append("rna")

                if "transcription" in text or "proseq" in text:
                    selected.append("proseq")

                if "hic" in text or "3d" in text:
                    selected.append("hic")

                if "microc" in text:
                    selected.append("microc")

                if "enhancer" in text or "starr" in text:
                    selected.append("starr")

            # ---- still nothing → show supported
            if not selected:
                return f"Supported: {list(self.modalities.keys())}"

            # ---- remove duplicates
            selected = list(set(selected))

            state["selected_modalities"] = selected
            state["stage"] = "awaiting_confirmation"

            return (
                f"Selected: {selected}\n\n"
                "Proceed? (yes/no)"
            )

        # ===============================
        # Stage 5: Run prediction
        # ===============================
        if state["stage"] == "awaiting_confirmation":

            if message.lower() in ["yes", "y"]:

                region = state["genomic_region"]
                bam = state["bam_file"]
                chrom = region["chromosome_id"].replace("chr", "")
                start = region["start_pos"]
                end = region["end_pos"]
                modalities = state["selected_modalities"]

                try:
                    outputs = []

                    for mod in modalities:
                        try:
                            out = run_epcot_prediction(
                                bam_path=bam,
                                chromosome=int(chrom),
                                start=start,
                                end=end,
                                modalities=[mod]
                            )
                            outputs.append(out)
                        except Exception as e:
                            outputs.append({"modality": mod, "error": str(e)})

                    state["last_outputs"] = outputs

                    # ===============================
                    # Combine pickle (KEY)
                    # ===============================
                    pickle_path = combine_json_to_pickle(
                        output_dir="prediction_outputs",
                        requested_modalities=modalities
                    )

                    state["combined_pickle"] = pickle_path

                except Exception as e:
                    state["stage"] = "completed"
                    return f"Prediction failed:\n{str(e)}"

                state["stage"] = "awaiting_plot_request"

                return (
                    "Prediction completed successfully.\n\n"
                    "Your result file is ready for download.\n\n"
                    "Would you like plots? (yes/no)"
                )

            if message.lower() in ["no", "n"]:
                state["stage"] = "awaiting_modality"
                return "Okay — choose another modality."

            return "Please answer yes/no."

        # ===============================
        # Stage 6: Plot
        # ===============================
        if message.lower() in ["yes", "y"]:
            try:
                region = state["genomic_region"]
                chrom = region["chromosome_id"].replace("chr", "")
                start = region["start_pos"]
                end = region["end_pos"]
                modalities = set(state["selected_modalities"])
        
                # ============================
                # REBUILD combined_pred_data
                # ============================
                combined_pred_data = {
                    "metadata": {
                        "chromosome": chrom,
                        "start": start,
                        "end": end,
                        "modalities": []
                    }
                }
        
                output_dir = "prediction_outputs"
        
                for filename in os.listdir(output_dir):
                    if not filename.endswith(".json"):
                        continue
        
                    filepath = os.path.join(output_dir, filename)
        
                    with open(filepath, "r") as f:
                        data = json.load(f)
        
                    for mod in data["metadata"]["modalities"]:
                        if mod in modalities and mod in data:
                            combined_pred_data[mod] = data[mod]
                            if mod not in combined_pred_data["metadata"]["modalities"]:
                                combined_pred_data["metadata"]["modalities"].append(mod)
        
                # ============================
                # Plot
                # ============================
                os.makedirs("prediction_plots", exist_ok=True)
        
                if modalities - self.modalities_2d:
                    path1 = f"prediction_plots/stacked_1d_chr{chrom}_{start}_{end}.png"
                    plot_all_modalities_stacked(combined_pred_data, path1)
                    state["stacked_plot_1d"] = path1
        
                if modalities & self.modalities_2d:
                    path2 = f"prediction_plots/stacked_2d_chr{chrom}_{start}_{end}.png"
                    plot_all_modalities_2d(combined_pred_data, path2)
                    state["stacked_plot_2d"] = path2
        
                state["stage"] = "completed"
        
                return "Plots generated. You can now download everything."
        
            except Exception as e:
                state["stage"] = "completed"
                return f"Plot error: {str(e)}"