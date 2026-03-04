#!/usr/bin/env python3
"""Auto Code Optimizer

- Multi-line input: paste code, submit with two consecutive empty lines.
- Formats with autopep8 (optional) then black (optional).
- Prints a few AST-based hints.

Run: python auto_optimizer.py
"""

from __future__ import annotations

import ast
import textwrap


def _try_import_black():
    try:
        import black  # type: ignore

        return black
    except Exception:
        return None


def _try_import_autopep8():
    try:
        import autopep8  # type: ignore

        return autopep8
    except Exception:
        return None


BLACK = _try_import_black()
AUTOPEP8 = _try_import_autopep8()

print("=" * 70)
print(" AUTO CODE OPTIMIZER – Paste deinen Code und drücke zweimal Enter")
print(" Beende mit Strg+C oder tippe 'exit' + Enter")
print("=" * 70)

if BLACK is None or AUTOPEP8 is None:
    missing = []
    if AUTOPEP8 is None:
        missing.append("autopep8")
    if BLACK is None:
        missing.append("black")
    if missing:
        print(f"Hinweis: Optionale Pakete fehlen ({', '.join(missing)}).")
        print("Tipp: python -m pip install black autopep8 pylint flake8")


def get_multiline_input() -> str:
    print("\nPaste deinen Code hier (zweimal Enter zum Abschicken):\n")
    lines: list[str] = []
    while True:
        try:
            line = input()
        except EOFError:
            return "exit"
        if line == "" and lines and lines[-1] == "":
            break
        lines.append(line)
    return "\n".join(lines).strip()


def try_format_with_black(code: str) -> str:
    if BLACK is None:
        return code
    try:
        return BLACK.format_str(code, mode=BLACK.Mode(line_length=88))
    except Exception as exc:
        return f"# Black hat nicht funktioniert: {exc}\n{code}"


def try_autopep8(code: str) -> str:
    if AUTOPEP8 is None:
        return code
    try:
        # autopep8 expects an argparse-style options object
        options = AUTOPEP8.parse_args(["--aggressive", "--aggressive", "--max-line-length", "88"])
        return AUTOPEP8.fix_code(code, options=options)
    except Exception:
        return code


def simple_lint_hints(code: str) -> list[str]:
    hints: list[str] = []
    try:
        tree = ast.parse(code)
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) and len(node.args.args) > 5:
                hints.append(
                    f"→ Funktion {node.name} hat viele Parameter → evtl. in Klasse oder dataclass auslagern?"
                )
            if isinstance(node, ast.For) and isinstance(node.iter, ast.Name):
                hints.append(
                    f"→ For-Schleife über {node.iter.id} → list comprehension möglich?"
                )
    except SyntaxError as exc:
        hints.append(f"SyntaxError: {exc}")
    return hints


def main() -> None:
    while True:
        raw_code = get_multiline_input()
        if raw_code.lower() in ("exit", "quit", "ende"):
            print("Tschüss!")
            break
        if not raw_code.strip():
            continue

        print("\n" + "─" * 70)
        print("Original:")
        print(textwrap.indent(raw_code, "    "))
        print("─" * 70)

        improved = raw_code

        improved = try_autopep8(improved)
        print("Nach autopep8:")
        print(textwrap.indent(improved, "    "))
        print("─" * 70)

        blacked = try_format_with_black(improved)
        print("Nach black:")
        print(textwrap.indent(blacked, "    "))

        hints = simple_lint_hints(blacked)
        if hints:
            print("\nSchnelle Verbesserungsideen:")
            for hint in hints:
                print("  " + hint)

        print("─" * 70)
        print("Fertig. Kopiere den black-Version-Code oder paste neuen Code.\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nBeendet.")
