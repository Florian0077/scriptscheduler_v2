from waitress import serve
import app
import socket
import sys

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

if __name__ == '__main__':
    # Pour le développement, utilisez Flask directement avec debug=True
    if len(sys.argv) > 1 and sys.argv[1] == '--debug':
        ip_address = get_ip_address()
        print(f"Mode développement avec rechargement automatique activé sur {ip_address}:2222")
        app.app.run(host=ip_address, port=2222, debug=True)
    # Pour la production, utilisez Waitress
    else:
        serve(app.app, host=get_ip_address(), port=2222, url_prefix='/scheduler_v2')