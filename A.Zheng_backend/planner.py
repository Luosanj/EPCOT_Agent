import re
from EPCOT_runner import run_epcot_prediction, get_supported_range, plot_epcot_predictions


class LLMGenomicPlanner:

    def __init__(self):

        # ===============================
        # Hierarchical Modality Structure
        # ===============================
        self.modalities = {
            "epi": "epigenomes.txt",

            "rna": [
                "CAGE-seq",
                "Total RNA-seq",
                "PolyA+ RNA-seq"
            ],

            "bru": [
                "Bru-seq",
                "BruUV-seq",
                "BruChase-seq"
            ],

            "microc": [
                "O/E normalized Micro-C",
                "KR normalized Micro-C"
            ],

            "hic": [
                "CTCF ChIA-PET",
                "RNApol2 ChIA-PET",
                "Hi-C"
            ],

            "intacthic": [
                "O/E normalized intact Hi-C",
                "KR normalized intact Hi-C"
            ],

            "rna_strand": [
                "Total RNA-seq (forward)",
                "Total RNA-seq (reverse)"
            ],

            "external_tf": "unseeen_tf.txt",

            "tt": [
                "TT-seq (forward)",
                "TT-seq (reverse)"
            ],

            "groseq": [
                "GRO-seq (forward)",
                "GRO-seq (reverse)"
            ],

            "grocap": [
                "GRO-cap (forward)",
                "GRO-cap (reverse)",
                "GRO-cap_wTAP (forward)",
                "GRO-cap_wTAP (reverse)"
            ],

            "proseq": [
                "PRO-seq (forward)",
                "PRO-seq (reverse)",
                "PRO-cap"
            ],

            "netcage": [
                "NET-CAGE (forward)",
                "NET-CAGE (reverse)"
            ],

            "starr": [
                "STARR-seq"
            ]
        }

    # ===================================
    # Extract modality intent
    # ===================================

    def extract_modality_intent(self, text):

        text = text.lower()

        if "transcription" in text or "pro-seq" in text:
            return "proseq"

        if "expression" in text or "rna-seq" in text:
            return "rna"

        if "enhancer" in text or "starr" in text:
            return "starr"

        if "3d" in text or "hic" in text:
            return "hic"

        if "microc" in text:
            return "microc"

        return None

    # ===================================
    # Extract genomic region
    # ===================================

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

    # ===================================
    # Main Chat Logic
    # ===================================

    def chat(self, message, state):

        state.setdefault("stage", "start")
        state.setdefault("disagreement_count", 0)
        state.setdefault("selected_modalities", [])

        # ===============================
        # Stage 1: Greeting
        # ===============================

        if state["stage"] == "start":

            state["stage"] = "awaiting_bam"

            return (
                "Hi! I'm EPCOT Assistant.\n\n"
                "Please upload your chromatin accessibility .bam file to begin."
            )

        # ===============================
        # Stage 2: Await BAM
        # ===============================

        if state["stage"] == "awaiting_bam":

            if not state.get("bam_file"):
                return "Please upload a valid .bam file using the upload button."

            state["stage"] = "awaiting_region"

            return (
                "Great! .bam file received.\n\n"
                "Please provide genomic region in format:\n"
                "chr1, 1000000, 2000000 "
            )

        # ===============================
        # Stage 3: Await Genomic Region
        # ===============================
        if state["stage"] == "awaiting_region":

            region = self.extract_genomic_region(message.strip())

            if region == "invalid_format":
                return (
                    "Invalid format.\n\n"
                    "Example:\nchr1, 1000000, 2000000"
                )

            if region == "invalid_range":
                return "start_pos must be smaller than end_pos."

            if region == "region_too_large":
                return "Region length must be <= 600,000 bp."

            # --------------------------------------------------
            # NEW: Check EPCOT coverage
            # --------------------------------------------------

            chrom = region["chromosome_id"].replace("chr", "")
            start = region["start_pos"]
            end = region["end_pos"]

            supported_range = get_supported_range(chrom)

            if supported_range is None:
                return f"No EPCOT windows found for chromosome {chrom}."

            min_start = supported_range["min_start"]
            max_end   = supported_range["max_end"]

            if start < min_start or end > max_end:

                return (
                    f"The requested region is outside EPCOT supported coverage.\n\n"
                    f"For chr{chrom}:\n"
                    f"Minimum supported start: {min_start}\n"
                    f"Maximum supported end: {max_end}\n\n"
                    "Please modify your region."
                )

            # --------------------------------------------------
            # Valid region
            # --------------------------------------------------

            state["genomic_region"] = region
            state["stage"] = "awaiting_modality"

            return (
                f"Region received:\n{region}\n\n"
                "What biological signal would you like to predict?\n"
                "(e.g., transcription activity, gene expression, enhancer activity)"
            )

        # ===============================
        # Stage 4: Await Modality
        # ===============================

        if state["stage"] == "awaiting_modality":

            modality = self.extract_modality_intent(message)

            if not modality:
                return (
                    "Supported modalities:\n"
                    f"{list(self.modalities.keys())}\n\n"
                    "Please describe what you want to predict."
                )

            state["selected_modalities"] = [modality]
            state["stage"] = "awaiting_confirmation"

            return (
                f"Selected modality: {modality}\n"
                f"Description: {self.modalities[modality]}\n\n"
                "Proceed with prediction? (yes/no)"
            )

        # ===============================
        # Stage 5: Confirmation
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
                    outputs = run_epcot_prediction(
                        bam_path=bam,
                        chromosome=int(chrom),
                        start=start,
                        end=end,
                        modalities=modalities
                    )

                except Exception as e:
                    state["stage"] = "completed"
                    return f"Prediction failed:\n{str(e)}"

                state["stage"] = "completed"

                plot_paths = outputs.get("plots", [])

                plot_text = ""
                if plot_paths:
                    plot_text = "\n\nGenerated plots:\n" + "\n".join(plot_paths)

                return (
                    "Prediction completed successfully.\n\n"
                    f"Predicted modalities:\n{outputs['modalities']}\n\n"
                    f"Prediction file saved at:\n{outputs['file_path']}"
                    f"{plot_text}\n\n"
                    "You may now visualize the generated plots or download the prediction JSON file."
                )

            if message.lower() in ["no", "n"]:

                state["disagreement_count"] += 1

                if state["disagreement_count"] >= 3:
                    state["stage"] = "completed"
                    return (
                        "Sorry, EPCOT currently doesn't support that configuration."
                    )

                state["stage"] = "awaiting_modality"
                return "Please describe the signal you would like to predict."

            return "Please answer 'yes' or 'no'."

        # ===============================
        # Completed
        # ===============================

        return "Session complete. Refresh to start again."