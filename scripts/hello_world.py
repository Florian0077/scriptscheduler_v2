#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Script de test qui affiche un message Hello World et la date/heure actuelle.
"""

import datetime
import sys
import os

def main():
    """Fonction principale qui affiche un message de bienvenue et l'heure actuelle."""
    print("=" * 50)
    print(f"HELLO WORLD depuis {os.path.basename(__file__)}")
    print(f"Date et heure: {datetime.datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print(f"Environnement Python: {sys.executable}")
    print(f"Version de Python: {sys.version}")
    print("=" * 50)
    
    # Simulation d'un traitement
    for i in range(5):
        print(f"Traitement étape {i+1}/5...")
    
    print("Script exécuté avec succès!")
    return 0

if __name__ == "__main__":
    sys.exit(main())
