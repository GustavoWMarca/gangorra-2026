"""Gera voice.mp3 + words.json (tempo por palavra) com edge-tts."""
import asyncio, json, sys
import edge_tts

TEXT = (
    "Em dois mil e vinte e seis, aconteceu uma coisa inédita no Brasil: quem perdeu o primeiro turno ganhou a eleição. "
    "Quatro de outubro: cento e vinte e cinco milhões de pessoas votaram. "
    "Flávio Bolsonaro sai na frente. Lula fica uns dois pontos atrás. "
    "Mas ninguém passa de cinquenta por cento. "
    "Vinte e um dias depois, segundo turno. "
    "Sabe por que virou? Segundo turno é uma gangorra: zera tudo, e quem votou nos outros onze candidatos tem que escolher um lado. "
    "Lula leva cinquenta e um vírgula setenta e nove por cento. Sessenta e quatro milhões de votos, recorde da vida dele. "
    "E dois dias depois, fez oitenta e um anos: o presidente mais velho já eleito no país."
)
VOICE = sys.argv[2] if len(sys.argv) > 2 else "pt-BR-AntonioNeural"
OUT = sys.argv[1]

async def main():
    c = edge_tts.Communicate(TEXT, VOICE, rate="+24%", boundary="WordBoundary")
    words = []
    with open(OUT + "/voice.mp3", "wb") as f:
        async for ch in c.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                words.append({"w": ch["text"], "t0": round(ch["offset"] / 1e7, 3), "t1": round((ch["offset"] + ch["duration"]) / 1e7, 3)})
    json.dump(words, open(OUT + "/words.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(len(words), "words, last", words[-1])

asyncio.run(main())
