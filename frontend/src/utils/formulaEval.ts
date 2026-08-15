// 주간보고 grouped_table의 "계산식" 필드용 안전한 사칙연산 수식 평가기.
// eval()/Function()을 쓰지 않고 직접 토크나이즈 + 재귀하강 파싱하여 평가한다.
// 지원 문법: + - * / ( ) 단항마이너스, 숫자, 식별자(다른 컬럼의 변수명=key)

type Token =
  | { type: 'num'; value: number }
  | { type: 'ident'; value: string }
  | { type: 'op'; value: '+' | '-' | '*' | '/' | '(' | ')' };

function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < formula.length) {
    const ch = formula[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < formula.length && /[0-9.]/.test(formula[j])) j++;
      const numStr = formula.slice(i, j);
      const num = Number(numStr);
      if (Number.isNaN(num)) throw new Error(`잘못된 숫자: ${numStr}`);
      tokens.push({ type: 'num', value: num });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < formula.length && /[A-Za-z0-9_]/.test(formula[j])) j++;
      tokens.push({ type: 'ident', value: formula.slice(i, j) });
      i = j;
      continue;
    }
    if ('+-*/()'.includes(ch)) {
      tokens.push({ type: 'op', value: ch as '+' | '-' | '*' | '/' | '(' | ')' });
      i++;
      continue;
    }
    throw new Error(`허용되지 않은 문자: ${ch}`);
  }
  return tokens;
}

class Parser {
  private pos = 0;
  constructor(private tokens: Token[], private vars: Record<string, number>) {}

  private peek(): Token | undefined { return this.tokens[this.pos]; }
  private next(): Token | undefined { return this.tokens[this.pos++]; }

  parse(): number {
    const result = this.parseExpr();
    if (this.pos < this.tokens.length) throw new Error('수식 형식이 올바르지 않습니다.');
    return result;
  }

  private parseExpr(): number {
    let value = this.parseTerm();
    while (this.peek()?.type === 'op' && (this.peek() as any).value in { '+': 1, '-': 1 }) {
      const op = (this.next() as any).value;
      const rhs = this.parseTerm();
      value = op === '+' ? value + rhs : value - rhs;
    }
    return value;
  }

  private parseTerm(): number {
    let value = this.parseFactor();
    while (this.peek()?.type === 'op' && (this.peek() as any).value in { '*': 1, '/': 1 }) {
      const op = (this.next() as any).value;
      const rhs = this.parseFactor();
      if (op === '/') {
        if (rhs === 0) throw new Error('0으로 나눌 수 없습니다.');
        value = value / rhs;
      } else {
        value = value * rhs;
      }
    }
    return value;
  }

  private parseFactor(): number {
    const tok = this.peek();
    if (!tok) throw new Error('수식이 올바르지 않습니다.');
    if (tok.type === 'op' && tok.value === '-') {
      this.next();
      return -this.parseFactor();
    }
    if (tok.type === 'op' && tok.value === '(') {
      this.next();
      const value = this.parseExpr();
      const close = this.next();
      if (!close || close.type !== 'op' || close.value !== ')') throw new Error('괄호가 맞지 않습니다.');
      return value;
    }
    if (tok.type === 'num') {
      this.next();
      return tok.value;
    }
    if (tok.type === 'ident') {
      this.next();
      if (!(tok.value in this.vars)) throw new Error(`알 수 없는 변수: ${tok.value}`);
      return this.vars[tok.value];
    }
    throw new Error('수식이 올바르지 않습니다.');
  }
}

/** 수식을 변수값으로 평가한다. 실패 시(문법 오류, 미지의 변수, 0으로 나누기 등) null을 반환한다. */
export function evaluateFormula(formula: string, vars: Record<string, number>): number | null {
  if (!formula || !formula.trim()) return null;
  try {
    const tokens = tokenize(formula);
    if (tokens.length === 0) return null;
    const result = new Parser(tokens, vars).parse();
    return Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

/** 수식에 등장하는 식별자(변수명) 목록만 추출 (미리보기/검증용) */
export function extractFormulaVariables(formula: string): string[] {
  try {
    return tokenize(formula)
      .filter((t): t is { type: 'ident'; value: string } => t.type === 'ident')
      .map(t => t.value);
  } catch {
    return [];
  }
}
