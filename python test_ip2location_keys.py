import requests
import json

# -----------------------------------------------------
# CONFIG — put your 3 API keys here
# -----------------------------------------------------

API_KEYS=[
'29991A6587DC7AAC710F1C441AC9D635',
'12DC6E9184F7FD5D9F8502A4844D8DCA',
'2A90E93525FF2BD945AF7E41F181289D'
]

BASE_URL = "https://api.ip2location.io/"


def get_own_ip():
    """Fetch your public IP address automatically."""
    try:
        ip = requests.get("https://api.ipify.org?format=text", timeout=5).text.strip()
        print(f"🌐 Detected your IP: {ip}")
        return ip
    except Exception as e:
        print("❌ Could not detect your IP:", e)
        return None


def call_ip2location(ip: str, api_key: str | None):
    """
    Calls IP2Location using a specific API key.
    If api_key is None → keyless mode.
    Returns parsed JSON or None if request fails.
    """
    params = {"ip": ip, "format": "json"}
    if api_key:
        params["key"] = api_key

    try:
        resp = requests.get(BASE_URL, params=params, timeout=5)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"❌ API call failed ({api_key}): {e}")
        return None


def evaluate_response(data: dict):
    """
    Checks is_vpn, is_proxy, and whether country_code == JP.
    """
    if not data:
        return None

    # country check
    country_code = str(data.get("country_code", "")).upper()
    is_japan = country_code == "JP"

    # top-level flags
    is_proxy = bool(data.get("is_proxy"))
    is_vpn = is_proxy or bool(data.get("is_vpn"))

    # nested proxy object flags
    proxy_obj = data.get("proxy", {})
    if isinstance(proxy_obj, dict):
        proxy_flags = [
            proxy_obj.get("is_vpn"),
            proxy_obj.get("is_tor"),
            proxy_obj.get("is_public_proxy"),
            proxy_obj.get("is_web_proxy"),
            proxy_obj.get("is_residential_proxy"),
            proxy_obj.get("is_data_center"),
        ]
        if any(proxy_flags):
            is_vpn = True

    # proxy_type fields
    proxy_type = data.get("proxy_type")
    nested_proxy_type = proxy_obj.get("proxy_type") if isinstance(proxy_obj, dict) else None

    def is_proxy_type(tp):
        if not tp:
            return False
        tp = str(tp).upper()
        return tp in ["VPN", "TOR", "PUB", "WEB", "RES", "DCH"]

    if is_proxy_type(proxy_type) or is_proxy_type(nested_proxy_type):
        is_vpn = True

    return {
        "country_code": country_code,
        "is_japan": is_japan,
        "is_proxy": is_proxy,
        "is_vpn": is_vpn,
        "proxy_type": proxy_type,
        "nested_proxy_type": nested_proxy_type,
        "raw": data,
    }


def test_all_keys(ip: str):
    print("\n==============================")
    print(f"🔍 Testing IP: {ip}")
    print("==============================\n")

    for idx, key in enumerate(API_KEYS, start=1):
        print(f"\n--- 🔑 Testing API KEY #{idx} ---")
        print(f"Key: {key}")

        data = call_ip2location(ip, key)
        if not data:
            print("❌ Could not get response\n")
            continue

        result = evaluate_response(data)
        if not result:
            print("❌ Parsing failed\n")
            continue

        print(json.dumps({
            "country_code": result["country_code"],
            "is_japan": result["is_japan"],
            "is_proxy": result["is_proxy"],
            "is_vpn": result["is_vpn"],
            "proxy_type": result["proxy_type"],
            "nested_proxy_type": result["nested_proxy_type"],
        }, indent=2))

    print("\nDone.\n")


if __name__ == "__main__":
    # AUTO-DETECT YOUR PUBLIC IP
    ip = get_own_ip()
    if not ip:
        print("Exiting.")
        exit(1)

    test_all_keys(ip)
