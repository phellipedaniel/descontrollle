export type ChartTransaction = {
  id: string;
  kind: "income" | "expense";
  amount: number | string;
  occurred_on: string;
  category_id: string | null;
  account_id?: string | null;
  payment_method_id?: string | null;
};
export type ChartCategory = { id: string; name: string };
export type MonthTotal = { month: number; income: number; expense: number; entries: number };
export type OverviewHistoryFilters = {
  categoryId?: string;
  accountId?: string;
  paymentMethodId?: string;
  kind?: "income" | "expense";
};
type QueryResult = { data: ChartTransaction[] | null; count: number | null; error: unknown };
type Query = PromiseLike<QueryResult> & {
  eq(key: string, value: string): Query;
  gte(key: string,value: string): Query;
  lt(key:string,value:string): Query;
  order(key:string): Query;
  range(start:number,end:number): Query;
};
export type HistoryClient = { from(table:string): { select(fields:string,options:{count:"exact"}): Query } };

export async function loadOverviewHistory(
  client: HistoryClient,
  userId: string,
  year: number,
  filters: OverviewHistoryFilters = {},
) {
  if (!userId) throw new Error("Authentication required");
  const rows: ChartTransaction[] = [];
  const ids = new Set<string>();
  let count: number | null = null;

  for (let offset=0; ; offset+=500) {
    let query = client
      .from("transactions")
      .select("id,kind,amount,occurred_on,category_id,account_id,payment_method_id",{count:"exact"})
      .eq("user_id",userId)
      .gte("occurred_on",`${year-1}-01-01`)
      .lt("occurred_on",`${year+1}-01-01`);

    if (filters.categoryId) query = query.eq("category_id",filters.categoryId);
    if (filters.accountId) query = query.eq("account_id",filters.accountId);
    if (filters.paymentMethodId) query = query.eq("payment_method_id",filters.paymentMethodId);
    if (filters.kind) query = query.eq("kind",filters.kind);

    const result = await query
      .order("occurred_on")
      .order("id")
      .range(offset,offset+499);

    if (
      result.error ||
      !result.data ||
      result.count === null ||
      result.count < 0 ||
      result.count > 50000 ||
      (count !== null && count !== result.count)
    ) {
      throw new Error("History unavailable");
    }

    count=result.count;
    for (const row of result.data) {
      if (ids.has(row.id)) throw new Error("History changed");
      ids.add(row.id);
      rows.push(row);
    }
    if (rows.length===count) return rows;
    if (!result.data.length || rows.length>count) throw new Error("Incomplete history");
  }
}

export function buildOverviewStory(
  rows: ChartTransaction[],
  categories: ChartCategory[],
  month: string,
  today: string,
  breakdownKind: "income" | "expense" = "expense",
) {
  const [year, selectedMonth]=month.split("-").map(Number);
  const current = Array.from({length:12},(_,i):MonthTotal=>({month:i+1,income:0,expense:0,entries:0}));
  const previous = current.map(m=>({...m}));

  for (const row of rows) {
    const amount=Number(row.amount);
    if (
      !Number.isFinite(amount) ||
      amount<0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(row.occurred_on) ||
      !["income","expense"].includes(row.kind)
    ) {
      throw new Error("Invalid history");
    }
    const [y,m]=row.occurred_on.split("-").map(Number);
    if (m<1 || m>12 || (y!==year && y!==year-1)) throw new Error("Invalid history period");
    if (row.occurred_on>today || m>selectedMonth) continue;
    const total=(y===year ? current : previous)[m-1];
    total[row.kind]+=amount;
    total.entries++;
  }

  const comparable = current
    .filter(
      m =>
        m.month<=selectedMonth &&
        `${year}-${String(m.month).padStart(2,"0")}`<today.slice(0,7) &&
        m.entries>0 &&
        previous[m.month-1].entries>0,
    )
    .map(m=>m.month);

  const names=new Map(categories.map(c=>[c.id,c.name]));
  const categoryMap=new Map<string,{id:string;name:string;current:number;previous:number}>();

  for (const row of rows) {
    const [y,m]=row.occurred_on.split("-").map(Number);
    if (row.kind!==breakdownKind || !comparable.includes(m) || row.occurred_on>today) continue;
    const id=row.category_id ?? "__uncategorized";
    const category=categoryMap.get(id) ?? {
      id,
      name:row.category_id ? names.get(id) ?? "Categoria indisponível" : "Sem categoria",
      current:0,
      previous:0,
    };
    category[y===year ? "current" : "previous"]+=Number(row.amount);
    categoryMap.set(id,category);
  }

  const ranked=[...categoryMap.values()].sort(
    (a,b)=>Math.max(b.current,b.previous)-Math.max(a.current,a.previous) || a.id.localeCompare(b.id),
  );
  const totals=(series:MonthTotal[])=>comparable.reduce(
    (acc,m)=>({
      income:acc.income+series[m-1].income,
      expense:acc.expense+series[m-1].expense,
    }),
    {income:0,expense:0},
  );

  return {
    year,
    selectedMonth,
    current,
    previous,
    comparable,
    categories:ranked,
    currentTotal:totals(current),
    previousTotal:totals(previous),
    partial:month===today.slice(0,7),
    breakdownKind,
  };
}
export type OverviewStory = ReturnType<typeof buildOverviewStory>;

export function changeLabel(current:number,previous:number) {
  if (previous===0) return current===0
    ? "Sem variação nos registros"
    : "Sem base percentual (referência zero)";
  const percent=(current-previous)/previous*100;
  return `${new Intl.NumberFormat("pt-BR",{maximumFractionDigits:1}).format(Math.abs(percent))}% ${percent>0 ? "acima" : percent<0 ? "abaixo" : "sem variação"}`;
}
