from waitress import serve
import app
import socket


def get_ip_address():
    try:
        # Création d'une connexion à un serveur fictif
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip_address = s.getsockname()[0]
        print("Serveur lancé sur : " + ip_address)
        s.close()
        return ip_address
    except socket.error as e:
        print("Erreur lors de la récupération de l'adresse IP:", e)
        return None
    
    
serve(app.app, host=get_ip_address(), port=2222, url_prefix='/scheduler_v2')

