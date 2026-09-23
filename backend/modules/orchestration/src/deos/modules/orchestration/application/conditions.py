"""Safe condition evaluator — minimal lexer + recursive descent parser.

Supported grammar (whitespace ignored):

  expr     := or_expr
  or_expr  := and_expr ( "or" and_expr )*
  and_expr := not_expr ( "and" not_expr )*
  not_expr := "not" not_expr | cmp_expr
  cmp_expr := value ( cmp_op value )?
  cmp_op   := "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "contains"
  value    := literal | path
  literal  := string | number | bool | "null" | list
  path     := identifier ( "." identifier | "[" integer "]" )*

A ``path`` resolves against the supplied context map.  ``variables.foo``
prefixes pull from ``context["variables"]``; bare names look up the
context directly; nested ``.a.b.c`` walks dicts / lists.

No ``eval`` is ever called — every operator is hand-rolled.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from deos.modules.orchestration.domain.errors import InvalidConditionExpression

__all__ = ["SafeConditionEvaluator"]


# ── Tokens ───────────────────────────────────────────────────────────────


@dataclass(slots=True, frozen=True)
class _Tok:
    kind: str
    value: Any = None
    pos: int = 0


_WS = {" ", "\t", "\n", "\r"}


def _tokenize(expr: str) -> list[_Tok]:
    tokens: list[_Tok] = []
    i = 0
    n = len(expr)
    while i < n:
        ch = expr[i]
        if ch in _WS:
            i += 1
            continue
        if ch in "()[]":
            tokens.append(_Tok(kind=ch, pos=i))
            i += 1
            continue
        if ch == ".":
            tokens.append(_Tok(kind=".", pos=i))
            i += 1
            continue
        if ch in "<>!":
            if i + 1 < n and expr[i + 1] == "=":
                tokens.append(_Tok(kind=expr[i : i + 2], pos=i))
                i += 2
            else:
                tokens.append(_Tok(kind=ch, pos=i))
                i += 1
            continue
        if ch == "=":
            if i + 1 < n and expr[i + 1] == "=":
                tokens.append(_Tok(kind="==", pos=i))
                i += 2
            else:
                raise InvalidConditionExpression(
                    f"unexpected '=' at position {i} (did you mean '=='?)"
                )
            continue
        if ch == ",":
            tokens.append(_Tok(kind=",", pos=i))
            i += 1
            continue
        if ch == '"' or ch == "'":
            # string literal
            end = expr.find(ch, i + 1)
            if end == -1:
                raise InvalidConditionExpression(f"unterminated string at position {i}")
            tokens.append(_Tok(kind="str", value=expr[i + 1 : end], pos=i))
            i = end + 1
            continue
        if ch.isdigit() or (ch == "-" and i + 1 < n and expr[i + 1].isdigit()):
            j = i + 1
            while j < n and (expr[j].isdigit() or expr[j] == "."):
                j += 1
            num_str = expr[i:j]
            try:
                value: Any = int(num_str) if "." not in num_str else float(num_str)
            except ValueError as exc:
                raise InvalidConditionExpression(
                    f"invalid number at position {i}: {num_str}"
                ) from exc
            tokens.append(_Tok(kind="num", value=value, pos=i))
            i = j
            continue
        if ch.isalpha() or ch == "_":
            j = i + 1
            while j < n and (expr[j].isalnum() or expr[j] == "_"):
                j += 1
            word = expr[i:j]
            tokens.append(_Tok(kind="ident", value=word, pos=i))
            i = j
            continue
        raise InvalidConditionExpression(f"unexpected character {ch!r} at position {i}")
    tokens.append(_Tok(kind="eof", pos=n))
    return tokens


# ── Parser / evaluator (single pass) ─────────────────────────────────────


class _Parser:
    def __init__(self, tokens: list[_Tok], context: dict[str, Any]) -> None:
        self._tokens = tokens
        self._i = 0
        self._ctx = context

    def _peek(self) -> _Tok:
        return self._tokens[self._i]

    def _advance(self) -> _Tok:
        tok = self._tokens[self._i]
        self._i += 1
        return tok

    def _eat(self, kind: str) -> _Tok:
        tok = self._advance()
        if tok.kind != kind:
            raise InvalidConditionExpression(
                f"expected {kind!r} at position {tok.pos}, got {tok.kind!r}"
            )
        return tok

    def parse(self) -> Any:
        value = self._or()
        if self._peek().kind != "eof":
            tok = self._peek()
            raise InvalidConditionExpression(
                f"unexpected token {tok.kind!r} at position {tok.pos}"
            )
        return value

    def _or(self) -> Any:
        left = self._and()
        while self._peek().kind == "ident" and self._peek().value == "or":
            self._advance()
            if bool(left):
                # short-circuit: skip the right operand entirely
                self._skip_and()
                continue
            right = self._and()
            left = bool(right)
        return left

    def _and(self) -> Any:
        left = self._not()
        while self._peek().kind == "ident" and self._peek().value == "and":
            self._advance()
            if not bool(left):
                # short-circuit: skip the right operand entirely
                self._skip_or()
                continue
            right = self._not()
            left = bool(right)
        return left

    def _skip_and(self) -> None:
        """Skip tokens until past the next ``and`` boundary."""
        depth = 0
        while True:
            tok = self._peek()
            if tok.kind == "eof":
                return
            if tok.kind == "(" or tok.kind == "[":
                depth += 1
            elif tok.kind == ")" or tok.kind == "]":
                if depth == 0:
                    return
                depth -= 1
            elif depth == 0 and tok.kind == "ident" and tok.value in {"or", "and"}:
                return
            self._advance()

    def _skip_or(self) -> None:
        """Skip tokens until past the next ``or`` boundary."""
        depth = 0
        while True:
            tok = self._peek()
            if tok.kind == "eof":
                return
            if tok.kind == "(" or tok.kind == "[":
                depth += 1
            elif tok.kind == ")" or tok.kind == "]":
                if depth == 0:
                    return
                depth -= 1
            elif depth == 0 and tok.kind == "ident" and tok.value == "or":
                return
            self._advance()

    def _not(self) -> Any:
        if self._peek().kind == "ident" and self._peek().value == "not":
            self._advance()
            return not self._not()
        return self._cmp()

    def _cmp(self) -> Any:
        left = self._value()
        tok = self._peek()
        op = None
        if tok.kind in {"==", "!=", "<", "<=", ">", ">="}:
            op = tok.kind
            self._advance()
        elif tok.kind == "ident" and tok.value in {"in", "contains"}:
            op = tok.value
            self._advance()
        if op is None:
            return left
        right = self._value()
        return _apply_cmp(op, left, right, tok.pos)

    def _value(self) -> Any:
        tok = self._peek()
        if tok.kind == "str":
            self._advance()
            return tok.value
        if tok.kind == "num":
            self._advance()
            return tok.value
        if tok.kind == "ident" and tok.value == "true":
            self._advance()
            return True
        if tok.kind == "ident" and tok.value == "false":
            self._advance()
            return False
        if tok.kind == "ident" and tok.value == "null":
            self._advance()
            return None
        if tok.kind == "ident":
            self._advance()
            return self._walk_path(tok.value)
        if tok.kind == "(":
            self._advance()
            inner = self._or()
            self._eat(")")
            return inner
        if tok.kind == "[":
            return self._list()
        raise InvalidConditionExpression(
            f"unexpected token {tok.kind!r} at position {tok.pos}"
        )

    def _list(self) -> list[Any]:
        self._eat("[")
        items: list[Any] = []
        if self._peek().kind != "]":
            items.append(self._or())
            while self._peek().kind == ",":
                self._advance()
                if self._peek().kind == "]":
                    break
                items.append(self._or())
        self._eat("]")
        return items

    def _walk_path(self, head: str) -> Any:
        if head == "variables":
            base: Any = self._ctx.get("variables", {})
        else:
            base = self._ctx.get(head, _MISSING)
        if base is _MISSING:
            raise InvalidConditionExpression(
                f"unknown identifier {head!r} in condition"
            )
        while True:
            tok = self._peek()
            if tok.kind == ".":
                self._advance()
                nxt = self._advance()
                if nxt.kind != "ident":
                    raise InvalidConditionExpression(
                        f"expected identifier after '.' at position {tok.pos}"
                    )
                base = _descend(base, nxt.value, tok.pos)
            elif tok.kind == "[":
                self._advance()
                idx_tok = self._advance()
                if idx_tok.kind != "num":
                    raise InvalidConditionExpression(
                        f"only integer indices supported, got {idx_tok.kind!r}"
                    )
                self._eat("]")
                base = _descend(base, int(idx_tok.value), tok.pos)
            else:
                return base


_MISSING = object()


def _descend(value: Any, key: Any, pos: int) -> Any:
    if isinstance(value, dict):
        if key not in value:
            return _MISSING
        return value[key]
    if isinstance(value, list):
        if not isinstance(key, int) or key < 0 or key >= len(value):
            return _MISSING
        return value[key]
    return _MISSING


def _apply_cmp(op: str, left: Any, right: Any, pos: int) -> bool:
    try:
        if op == "==":
            return left == right
        if op == "!=":
            return left != right
        if op == "<":
            return left < right
        if op == "<=":
            return left <= right
        if op == ">":
            return left > right
        if op == ">=":
            return left >= right
        if op == "in":
            if right is _MISSING or right is None:
                return False
            return left in right
        if op == "contains":
            if isinstance(left, str) and isinstance(right, str):
                return right in left
            if isinstance(left, (list, tuple, set, frozenset)):
                return right in left
            if isinstance(left, dict):
                return right in left
            return False
    except TypeError as exc:
        raise InvalidConditionExpression(
            f"operator {op!r} not defined for "
            f"{type(left).__name__} and {type(right).__name__} "
            f"at position {pos}: {exc}"
        ) from exc
    raise InvalidConditionExpression(f"unknown operator {op!r}")


class SafeConditionEvaluator:
    """Hand-rolled evaluator with no ``eval`` and no globals."""

    def evaluate(
        self,
        *,
        expression: str,
        context: dict[str, Any],
    ) -> Any:
        try:
            tokens = _tokenize(expression)
            return _Parser(tokens, context).parse()
        except InvalidConditionExpression:
            raise
        except Exception as exc:
            raise InvalidConditionExpression(
                f"failed to evaluate {expression!r}: {exc}"
            ) from exc
