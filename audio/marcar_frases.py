"""Casa as palavras com tempo (words.json) com o roteiro (um trecho por linha) e marca em cada palavra:
  s = número da linha do roteiro (0, 1, 2…)   k = posição da palavra nessa linha   w = a palavra ESCRITA no roteiro
Palavras da gravação que não estão no roteiro (repetição, "é…", improviso) ficam com s/k do vizinho e "extra": true.
Palavras do roteiro que não foram faladas ganham tempo interpolado e "faltou": true (o script avisa).
uso: py audio/marcar_frases.py <words.json> <roteiro.txt> [saida.json]"""
import difflib, json, re, sys, unicodedata

def norm(w):
    w = unicodedata.normalize("NFD", w.lower())
    w = "".join(c for c in w if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", w)

def script_words(path):
    out = []
    for s, line in enumerate(l for l in open(path, encoding="utf-8").read().splitlines() if l.strip()):
        for k, w in enumerate(re.findall(r"[\wÀ-ÿ]+(?:-[\wÀ-ÿ]+)*", line)):
            out.append({"w": w, "s": s, "k": k})
    return out

def mark(words, script):
    a, b = [norm(x["w"]) for x in words], [norm(x["w"]) for x in script]
    sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
    m = {}  # script index -> words index
    for blk in sm.get_matching_blocks():
        for i in range(blk.size): m[blk.b + i] = blk.a + i
    # fuzzy pass for near-misses inside the gaps (whisper spelling): pair in order when similar enough
    for tag, i0, i1, j0, j1 in sm.get_opcodes():
        if tag == "replace":
            for j in range(j0, j1):
                best = max(range(i0, i1), key=lambda i: difflib.SequenceMatcher(a=a[i], b=b[j]).ratio(), default=None)
                if best is not None and difflib.SequenceMatcher(a=a[best], b=b[j]).ratio() >= 0.6 and best not in m.values():
                    m[j] = best
    out, missing = [], []
    for j, sw in enumerate(script):
        if j in m:
            w = words[m[j]]; out.append({"w": sw["w"], "t0": w["t0"], "t1": w["t1"], "s": sw["s"], "k": sw["k"]})
        else:
            out.append({"w": sw["w"], "t0": None, "t1": None, "s": sw["s"], "k": sw["k"], "faltou": True}); missing.append(sw["w"])
    # interpolate the unspoken / unmatched ones between their known neighbours
    for i, x in enumerate(out):
        if x["t0"] is None:
            prev = next((out[p]["t1"] for p in range(i - 1, -1, -1) if out[p]["t0"] is not None), 0.0)
            nxt = next((out[n]["t0"] for n in range(i + 1, len(out)) if out[n]["t0"] is not None), prev + 0.3)
            x["t0"] = round(prev, 3); x["t1"] = round(max(prev, nxt), 3)
    return out, missing

if __name__ == "__main__":
    wpath, spath = sys.argv[1], sys.argv[2]
    dst = sys.argv[3] if len(sys.argv) > 3 else wpath
    words = json.load(open(wpath, encoding="utf-8"))
    out, missing = mark(words, script_words(spath))
    json.dump(out, open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    lines = max(x["s"] for x in out) + 1
    print(f"{len(out)} palavras do roteiro em {lines} linhas; {len(words)} palavras faladas")
    if missing: print("ATENÇÃO, sem tempo na gravação (interpolado):", ", ".join(missing))
    for s in range(lines):
        ws = [x for x in out if x["s"] == s]
        print(f"linha {s:2d}  {ws[0]['t0']:6.2f}-{ws[-1]['t1']:6.2f}s  {' '.join(x['w'] for x in ws)[:70]}")
