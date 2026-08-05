import re
from typing import Dict, Any

class CalculatorService:
    """Service pour effectuer des calculs mathématiques"""
    
    @staticmethod
    def calculate(expression: str) -> Dict[str, Any]:
        """Effectue un calcul à partir d'une expression"""
        try:
            # Nettoie l'expression
            clean_expr = re.sub(r'[^0-9+\-*/().\s]', '', expression)
            
            # Évalue l'expression de manière sécurisée
            result = eval(clean_expr, {"__builtins__": {}}, {})
            
            return {
                'success': True,
                'expression': clean_expr,
                'result': result
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def calculate_from_words(message: str, numbers: list) -> Dict[str, Any]:
        """Calcule à partir de mots-clés"""
        message_lower = message.lower()
        
        if len(numbers) < 2:
            return {'success': False, 'error': 'Pas assez de nombres'}
        
        num1, num2 = numbers[0], numbers[1]
        
        operations = {
            'addition': ('+', num1 + num2),
            'plus': ('+', num1 + num2),
            'soustraction': ('-', num1 - num2),
            'moins': ('-', num1 - num2),
            'multiplication': ('×', num1 * num2),
            'multiplié': ('×', num1 * num2),
            'fois': ('×', num1 * num2),
            'division': ('÷', num1 / num2 if num2 != 0 else 'Erreur'),
            'divisé': ('÷', num1 / num2 if num2 != 0 else 'Erreur'),
        }
        
        for keyword, (operator, result) in operations.items():
            if keyword in message_lower:
                return {
                    'success': True,
                    'expression': f"{num1} {operator} {num2}",
                    'result': result
                }
        
        # Par défaut, essaie d'évaluer directement
        return CalculatorService.calculate(' '.join(map(str, numbers)))
