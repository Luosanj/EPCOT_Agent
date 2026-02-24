from typing import List, Optional, Dict, Any

try:
    from .config import GenomicLLMConfig
except ImportError:
    # Fallback for direct execution
    from config import GenomicLLMConfig


class ModalityPredictionTemplate:
    """Base class for prediction templates."""
    
    @staticmethod
    def format_query(
        chromosome: str,
        start: int,
        end: int,
        modalities: List[str],
        cell_type: str,
        atac_seq_path: Optional[str] = None
    ) -> str:
        """
        Format a genomic prediction query.
        
        Args:
            chromosome: Chromosome number (1-22, X, Y)
            start: Start coordinate
            end: End coordinate
            modalities: List of selected modalities
            cell_type: Cell type for prediction
            atac_seq_path: Optional path to ATAC-seq pickle file
            
        Returns:
            Formatted query string
        """
        query_parts = [
            f"**Genomic Region:**",
            f"- Chromosome: {chromosome}",
            f"- Start: {start}",
            f"- End: {end}",
            f"- Region Size: {end - start:,} bp",
            f"",
            f"**Cell Type:** {cell_type}",
            f"",
            f"**Modalities:**",
        ]
        
        for modality in modalities:
            query_parts.append(f"- {modality}")
        
        if atac_seq_path:
            query_parts.extend([
                f"",
                f"**ATAC-seq Data:** {atac_seq_path}",
            ])
        
        return "\n".join(query_parts)
    
    @staticmethod
    def format_explanation_request(result: Dict[str, Any], modality: Optional[str] = None) -> str:
        """
        Format a request to explain prediction results.
        
        Args:
            result: AnalysisResult dictionary
            modality: Optional specific modality to explain
            
        Returns:
            Formatted explanation request
        """
        parts = [
            f"Explain the following prediction result:",
            f"",
            f"- Task Type: {result.get('taskType', 'Unknown')}",
            f"- Score: {result.get('score', 'N/A')}",
            f"- Confidence: {result.get('confidence', 'N/A')}",
            f"- Classification: {result.get('classification', 'N/A')}",
        ]
        
        if modality:
            parts.append(f"- Modality: {modality}")
        
        region = result.get('region', {})
        if region:
            parts.extend([
                f"- Region: {region.get('chromosome', 'N/A')}:{region.get('start', 'N/A')}-{region.get('end', 'N/A')}",
            ])
        
        return "\n".join(parts)
    
    @staticmethod
    def format_comparison_request(results: List[Dict[str, Any]]) -> str:
        """
        Format a request to compare multiple results.
        
        Args:
            results: List of AnalysisResult dictionaries
            
        Returns:
            Formatted comparison request
        """
        parts = [
            f"Compare the following {len(results)} prediction results:",
            f"",
        ]
        
        for i, result in enumerate(results, 1):
            parts.extend([
                f"**Result {i}:**",
                f"- Task Type: {result.get('taskType', 'Unknown')}",
                f"- Score: {result.get('score', 'N/A')}",
                f"- Confidence: {result.get('confidence', 'N/A')}",
                f"- Classification: {result.get('classification', 'N/A')}",
                f"",
            ])
        
        return "\n".join(parts)


class EpigenomicFeaturePredictionTemplate(ModalityPredictionTemplate):
    """Template for Epigenomic Feature Prediction (EFP) queries."""
    
    @staticmethod
    def format_efp_query(
        chromosome: str,
        start: int,
        end: int,
        cell_type: str,
        include_additional_tfs: bool = False,
        atac_seq_path: Optional[str] = None
    ) -> str:
        """
        Format an EFP-specific query.
        
        Args:
            chromosome: Chromosome number
            start: Start coordinate
            end: End coordinate
            cell_type: Cell type
            include_additional_tfs: Whether to include additional TF-bindings
            atac_seq_path: Optional ATAC-seq data path
            
        Returns:
            Formatted EFP query
        """
        modalities = ["Epigenomic features (TF-bindings + 11 histone marks)"]
        if include_additional_tfs:
            modalities.append("Additional TF-bindings")
        
        return ModalityPredictionTemplate.format_query(
            chromosome=chromosome,
            start=start,
            end=end,
            modalities=modalities,
            cell_type=cell_type,
            atac_seq_path=atac_seq_path
        )


class GeneExpressionPredictionTemplate(ModalityPredictionTemplate):
    """Template for Gene Expression Prediction (GEP) queries."""
    
    @staticmethod
    def format_gep_query(
        chromosome: str,
        start: int,
        end: int,
        cell_type: str,
        expression_modalities: Optional[List[str]] = None,
        atac_seq_path: Optional[str] = None
    ) -> str:
        """
        Format a GEP-specific query.
        
        Args:
            chromosome: Chromosome number
            start: Start coordinate
            end: End coordinate
            cell_type: Cell type
            expression_modalities: List of expression modalities to include
            atac_seq_path: Optional ATAC-seq data path
            
        Returns:
            Formatted GEP query
        """
        if expression_modalities is None:
            expression_modalities = [
                "RNA-seq",
                "RNA strand-specific",
                "GRO-seq",
            ]
        
        return ModalityPredictionTemplate.format_query(
            chromosome=chromosome,
            start=start,
            end=end,
            modalities=expression_modalities,
            cell_type=cell_type,
            atac_seq_path=atac_seq_path
        )


class EnhancerActivityPredictionTemplate(ModalityPredictionTemplate):
    """Template for Enhancer Activity Prediction (EAP) queries."""
    
    @staticmethod
    def format_eap_query(
        chromosome: str,
        start: int,
        end: int,
        cell_type: str,
        include_starr_seq: bool = True,
        include_chromatin: bool = False,
        atac_seq_path: Optional[str] = None
    ) -> str:
        """
        Format an EAP-specific query.
        
        Args:
            chromosome: Chromosome number
            start: Start coordinate
            end: End coordinate
            cell_type: Cell type
            include_starr_seq: Whether to include STARR-seq
            include_chromatin: Whether to include chromatin structure modalities
            atac_seq_path: Optional ATAC-seq data path
            
        Returns:
            Formatted EAP query
        """
        modalities = []
        
        if include_starr_seq:
            modalities.append("STARR-seq")
        
        if include_chromatin:
            modalities.extend(["Hi-C", "Micro-C"])
        
        # EAP often benefits from epigenomic context
        modalities.append("Epigenomic features (TF-bindings + 11 histone marks)")
        
        return ModalityPredictionTemplate.format_query(
            chromosome=chromosome,
            start=start,
            end=end,
            modalities=modalities,
            cell_type=cell_type,
            atac_seq_path=atac_seq_path
        )


def get_template_for_task(task_type: str) -> ModalityPredictionTemplate:
    """
    Get the appropriate template class for a task type.
    
    Args:
        task_type: 'EFP', 'GEP', or 'EAP'
        
    Returns:
        Template class instance
    """
    templates = {
        'EFP': EpigenomicFeaturePredictionTemplate,
        'GEP': GeneExpressionPredictionTemplate,
        'EAP': EnhancerActivityPredictionTemplate,
    }
    
    template_class = templates.get(task_type.upper())
    if template_class:
        return template_class()
    
    return ModalityPredictionTemplate()
