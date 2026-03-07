import urllib.request
import urllib.error

try:
    with urllib.request.urlopen("http://localhost:8000/rev/kpis") as response:
        print("Success:", response.read().decode()[:100])
except urllib.error.HTTPError as e:
    error_body = e.read().decode()
    with open('out.json', 'w', encoding='utf-8') as f:
        f.write(error_body)
    print("Error saved to out.json successfully.")
except Exception as e:
    print("Other error:", e)
