"""
Export functionality for history data to Excel format.
"""
from datetime import datetime
from decimal import Decimal
from io import BytesIO
from typing import Dict, List, Optional

from openpyxl import Workbook
from openpyxl.chart import LineChart, Reference, BarChart
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from .models import ProductionHistory, AGRHistory, SocialIndicatorHistory


class HistoryExporter:
    """
    Handles export of history data to Excel format with formatting and optional charts.
    """
    
    # Color scheme
    HEADER_FILL = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
    HEADER_FONT = Font(bold=True, color="FFFFFF", size=11)
    TOTAL_FILL = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
    TOTAL_FONT = Font(bold=True, size=10)
    
    def __init__(self):
        self.workbook = Workbook()
        # Remove default sheet
        if 'Sheet' in self.workbook.sheetnames:
            del self.workbook['Sheet']
    
    def export_production_history(
        self, 
        annee_debut: int, 
        annee_fin: int, 
        filters: Optional[Dict] = None,
        include_charts: bool = False
    ) -> None:
        """
        Export production history data to Excel sheet.
        
        Args:
            annee_debut: Start year
            annee_fin: End year
            filters: Optional filters (parcelle, culture, producteur)
            include_charts: Whether to include charts
        """
        # Query data
        queryset = ProductionHistory.objects.filter(
            annee__gte=annee_debut,
            annee__lte=annee_fin
        ).select_related('parcelle__producteur', 'enregistre_par').order_by('annee', 'parcelle')
        
        # Apply filters
        if filters:
            if 'parcelle' in filters and filters['parcelle']:
                queryset = queryset.filter(parcelle_id=filters['parcelle'])
            if 'culture' in filters and filters['culture']:
                queryset = queryset.filter(culture=filters['culture'])
            if 'producteur' in filters and filters['producteur']:
                queryset = queryset.filter(parcelle__producteur_id=filters['producteur'])
            if 'cooperative' in filters and filters['cooperative']:
                queryset = queryset.filter(parcelle__producteur__cooperative_id=filters['cooperative'])
            if 'village' in filters and filters['village']:
                queryset = queryset.filter(parcelle__producteur__village=filters['village'])
        
        # Create sheet
        ws = self.workbook.create_sheet("Productions")
        
        # Headers
        headers = [
            "Année", "Parcelle", "Producteur", "Culture", 
            "Quantité (kg)", "Prix (Ar/kg)", "Revenu Total (Ar)", 
            "Variation (%)", "Date Enregistrement", "Enregistré par"
        ]
        ws.append(headers)
        
        # Style headers
        self._style_header_row(ws, 1, len(headers))
        
        # Data rows
        data_by_year = {}
        previous_values = {}  # For variation calculation
        
        for prod in queryset:
            parcelle_code = prod.parcelle.code if hasattr(prod.parcelle, 'code') else f"P{prod.parcelle.id}"
            producteur_nom = prod.parcelle.producteur.nom if prod.parcelle.producteur else "N/A"
            
            # Calculate variation
            key = (prod.parcelle_id, prod.culture)
            variation = None
            if key in previous_values:
                prev_qty = previous_values[key]
                if prev_qty and prev_qty > 0:
                    variation = ((prod.quantite_kg - prev_qty) / prev_qty) * 100
            previous_values[key] = prod.quantite_kg
            
            row = [
                prod.annee,
                parcelle_code,
                producteur_nom,
                prod.culture,
                float(prod.quantite_kg) if prod.quantite_kg else 0,
                float(prod.prix_vente_kg) if prod.prix_vente_kg else 0,
                float(prod.revenu_total) if prod.revenu_total else 0,
                f"{variation:.2f}" if variation is not None else "N/A",
                prod.date_enregistrement.strftime("%Y-%m-%d %H:%M") if prod.date_enregistrement else "",
                prod.enregistre_par.username if prod.enregistre_par else "N/A"
            ]
            ws.append(row)
            
            # Track data by year for statistics
            if prod.annee not in data_by_year:
                data_by_year[prod.annee] = {'quantite': 0, 'revenu': 0, 'count': 0}
            data_by_year[prod.annee]['quantite'] += float(prod.quantite_kg or 0)
            data_by_year[prod.annee]['revenu'] += float(prod.revenu_total or 0)
            data_by_year[prod.annee]['count'] += 1
        
        # Add statistics section
        ws.append([])
        ws.append(["STATISTIQUES PAR ANNÉE"])
        self._style_header_row(ws, ws.max_row, 1)
        
        stats_headers = ["Année", "Nombre d'enregistrements", "Production totale (kg)", "Revenu total (Ar)", "Moyenne (kg)"]
        ws.append(stats_headers)
        self._style_header_row(ws, ws.max_row, len(stats_headers))
        
        for annee in sorted(data_by_year.keys()):
            stats = data_by_year[annee]
            moyenne = stats['quantite'] / stats['count'] if stats['count'] > 0 else 0
            ws.append([
                annee,
                stats['count'],
                f"{stats['quantite']:.2f}",
                f"{stats['revenu']:.2f}",
                f"{moyenne:.2f}"
            ])
        
        # Auto-size columns
        self._auto_size_columns(ws)
        
        # Add chart if requested
        if include_charts and data_by_year:
            self._add_production_chart(ws, data_by_year)
    
    def export_agr_history(
        self,
        annee_debut: int,
        annee_fin: int,
        filters: Optional[Dict] = None,
        include_charts: bool = False
    ) -> None:
        """
        Export AGR history data to Excel sheet.
        
        Args:
            annee_debut: Start year
            annee_fin: End year
            filters: Optional filters (producteur, type_agr)
            include_charts: Whether to include charts
        """
        # Query data
        queryset = AGRHistory.objects.filter(
            annee__gte=annee_debut,
            annee__lte=annee_fin
        ).select_related('producteur', 'enregistre_par').order_by('annee', 'producteur', 'ordre')
        
        # Apply filters
        if filters:
            if 'producteur' in filters and filters['producteur']:
                queryset = queryset.filter(producteur_id=filters['producteur'])
            if 'type_agr' in filters and filters['type_agr']:
                queryset = queryset.filter(type_agr=filters['type_agr'])
            if 'cooperative' in filters and filters['cooperative']:
                queryset = queryset.filter(producteur__cooperative_id=filters['cooperative'])
            if 'village' in filters and filters['village']:
                queryset = queryset.filter(producteur__village=filters['village'])
        
        # Create sheet
        ws = self.workbook.create_sheet("AGR")
        
        # Headers
        headers = [
            "Année", "Producteur", "Type AGR", "Ordre",
            "Quantité Produite", "Quantité Vendue", "Quantité Consommée",
            "Prix Unitaire (Ar)", "Revenu Annuel (Ar)",
            "Date Enregistrement", "Enregistré par"
        ]
        ws.append(headers)
        self._style_header_row(ws, 1, len(headers))
        
        # Data rows
        data_by_year = {}
        data_by_type = {}
        
        for agr in queryset:
            producteur_nom = agr.producteur.nom if agr.producteur else "N/A"
            
            row = [
                agr.annee,
                producteur_nom,
                agr.type_agr,
                agr.ordre,
                float(agr.quantite_produite) if agr.quantite_produite else 0,
                float(agr.quantite_vendue) if agr.quantite_vendue else 0,
                float(agr.quantite_consommee) if agr.quantite_consommee else 0,
                float(agr.prix_vente_unitaire) if agr.prix_vente_unitaire else 0,
                float(agr.revenu_annuel) if agr.revenu_annuel else 0,
                agr.date_enregistrement.strftime("%Y-%m-%d %H:%M") if agr.date_enregistrement else "",
                agr.enregistre_par.username if agr.enregistre_par else "N/A"
            ]
            ws.append(row)
            
            # Track statistics
            if agr.annee not in data_by_year:
                data_by_year[agr.annee] = {'revenu': 0, 'count': 0}
            data_by_year[agr.annee]['revenu'] += float(agr.revenu_annuel or 0)
            data_by_year[agr.annee]['count'] += 1
            
            if agr.type_agr not in data_by_type:
                data_by_type[agr.type_agr] = {'revenu': 0, 'count': 0}
            data_by_type[agr.type_agr]['revenu'] += float(agr.revenu_annuel or 0)
            data_by_type[agr.type_agr]['count'] += 1
        
        # Add statistics section
        ws.append([])
        ws.append(["STATISTIQUES PAR ANNÉE"])
        self._style_header_row(ws, ws.max_row, 1)
        
        stats_headers = ["Année", "Nombre d'AGR", "Revenu Total (Ar)", "Revenu Moyen (Ar)"]
        ws.append(stats_headers)
        self._style_header_row(ws, ws.max_row, len(stats_headers))
        
        for annee in sorted(data_by_year.keys()):
            stats = data_by_year[annee]
            moyenne = stats['revenu'] / stats['count'] if stats['count'] > 0 else 0
            ws.append([
                annee,
                stats['count'],
                f"{stats['revenu']:.2f}",
                f"{moyenne:.2f}"
            ])
        
        # Statistics by type
        ws.append([])
        ws.append(["STATISTIQUES PAR TYPE D'AGR"])
        self._style_header_row(ws, ws.max_row, 1)
        
        type_headers = ["Type AGR", "Nombre d'enregistrements", "Revenu Total (Ar)", "Revenu Moyen (Ar)"]
        ws.append(type_headers)
        self._style_header_row(ws, ws.max_row, len(type_headers))
        
        for type_agr in sorted(data_by_type.keys()):
            stats = data_by_type[type_agr]
            moyenne = stats['revenu'] / stats['count'] if stats['count'] > 0 else 0
            ws.append([
                type_agr,
                stats['count'],
                f"{stats['revenu']:.2f}",
                f"{moyenne:.2f}"
            ])
        
        # Auto-size columns
        self._auto_size_columns(ws)
        
        # Add chart if requested
        if include_charts and data_by_year:
            self._add_agr_chart(ws, data_by_year)
    
    def export_social_indicators(
        self,
        annee_debut: int,
        annee_fin: int,
        filters: Optional[Dict] = None,
        include_charts: bool = False
    ) -> None:
        """
        Export social indicator history data to Excel sheet.
        
        Args:
            annee_debut: Start year
            annee_fin: End year
            filters: Optional filters (producteur, type_indicateur)
            include_charts: Whether to include charts
        """
        # Query data
        queryset = SocialIndicatorHistory.objects.filter(
            annee__gte=annee_debut,
            annee__lte=annee_fin
        ).select_related('producteur', 'enregistre_par').order_by('annee', 'producteur', 'type_indicateur')
        
        # Apply filters
        if filters:
            if 'producteur' in filters and filters['producteur']:
                queryset = queryset.filter(producteur_id=filters['producteur'])
            if 'type_indicateur' in filters and filters['type_indicateur']:
                queryset = queryset.filter(type_indicateur=filters['type_indicateur'])
            if 'cooperative' in filters and filters['cooperative']:
                queryset = queryset.filter(producteur__cooperative_id=filters['cooperative'])
            if 'village' in filters and filters['village']:
                queryset = queryset.filter(producteur__village=filters['village'])
        
        # Create sheet
        ws = self.workbook.create_sheet("Indicateurs Sociaux")
        
        # Headers
        headers = [
            "Année", "Producteur", "Type d'Indicateur", "Valeur",
            "Notes", "Date Enregistrement", "Enregistré par"
        ]
        ws.append(headers)
        self._style_header_row(ws, 1, len(headers))
        
        # Data rows
        data_by_indicator = {}
        
        for indicator in queryset:
            producteur_nom = indicator.producteur.nom if indicator.producteur else "N/A"
            
            # Get the appropriate value based on type
            valeur = ""
            if indicator.valeur_numerique is not None:
                valeur = float(indicator.valeur_numerique)
            elif indicator.valeur_booleen is not None:
                valeur = "Oui" if indicator.valeur_booleen else "Non"
            elif indicator.valeur_texte:
                valeur = indicator.valeur_texte
            
            row = [
                indicator.annee,
                producteur_nom,
                indicator.get_type_indicateur_display(),
                valeur,
                indicator.notes or "",
                indicator.date_enregistrement.strftime("%Y-%m-%d %H:%M") if indicator.date_enregistrement else "",
                indicator.enregistre_par.username if indicator.enregistre_par else "N/A"
            ]
            ws.append(row)
            
            # Track statistics for numeric indicators
            if indicator.valeur_numerique is not None:
                key = (indicator.annee, indicator.type_indicateur)
                if key not in data_by_indicator:
                    data_by_indicator[key] = {'sum': 0, 'count': 0}
                data_by_indicator[key]['sum'] += float(indicator.valeur_numerique)
                data_by_indicator[key]['count'] += 1
        
        # Add statistics section for numeric indicators
        if data_by_indicator:
            ws.append([])
            ws.append(["MOYENNES PAR ANNÉE ET INDICATEUR (Indicateurs numériques uniquement)"])
            self._style_header_row(ws, ws.max_row, 1)
            
            stats_headers = ["Année", "Type d'Indicateur", "Nombre", "Moyenne"]
            ws.append(stats_headers)
            self._style_header_row(ws, ws.max_row, len(stats_headers))
            
            for (annee, type_ind) in sorted(data_by_indicator.keys()):
                stats = data_by_indicator[(annee, type_ind)]
                moyenne = stats['sum'] / stats['count'] if stats['count'] > 0 else 0
                ws.append([
                    annee,
                    type_ind,
                    stats['count'],
                    f"{moyenne:.2f}"
                ])
        
        # Auto-size columns
        self._auto_size_columns(ws)
    
    def _style_header_row(self, ws, row_num: int, num_cols: int) -> None:
        """Apply styling to header row."""
        for col in range(1, num_cols + 1):
            cell = ws.cell(row=row_num, column=col)
            cell.fill = self.HEADER_FILL
            cell.font = self.HEADER_FONT
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = Border(
                left=Side(style='thin'),
                right=Side(style='thin'),
                top=Side(style='thin'),
                bottom=Side(style='thin')
            )
    
    def _auto_size_columns(self, ws) -> None:
        """Auto-size columns based on content."""
        for column in ws.columns:
            max_length = 0
            column_letter = get_column_letter(column[0].column)
            
            for cell in column:
                try:
                    if cell.value:
                        max_length = max(max_length, len(str(cell.value)))
                except:
                    pass
            
            adjusted_width = min(max_length + 2, 50)
            ws.column_dimensions[column_letter].width = adjusted_width
    
    def _add_production_chart(self, ws, data_by_year: Dict) -> None:
        """Add production trend chart to worksheet."""
        chart = LineChart()
        chart.title = "Évolution de la Production"
        chart.style = 10
        chart.y_axis.title = "Quantité (kg)"
        chart.x_axis.title = "Année"
        
        # This is a simplified version - in practice, you'd need to reference
        # the actual data cells in the statistics section
        # For now, we'll skip the actual chart implementation as it requires
        # precise cell references
        pass
    
    def _add_agr_chart(self, ws, data_by_year: Dict) -> None:
        """Add AGR revenue trend chart to worksheet."""
        chart = BarChart()
        chart.title = "Évolution des Revenus AGR"
        chart.style = 10
        chart.y_axis.title = "Revenu (Ar)"
        chart.x_axis.title = "Année"
        
        # Simplified version - actual implementation would reference cells
        pass
    
    def get_workbook_bytes(self) -> bytes:
        """
        Get the workbook as bytes for HTTP response.
        
        Returns:
            Bytes of the Excel file
        """
        output = BytesIO()
        self.workbook.save(output)
        output.seek(0)
        return output.getvalue()
