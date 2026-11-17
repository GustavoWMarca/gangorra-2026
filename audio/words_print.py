import json, sys
w = json.load(open(sys.argv[1], encoding="utf-8"))
print(" ".join(f"{x['w']}@{x['t0']}" for x in w))
