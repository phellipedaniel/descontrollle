"use client";
import { useState } from "react";
import { formatBRL } from "@/lib/finance";
import { changeLabel, type OverviewStory, type MonthTotal } from "@/lib/overview-charts";
const months=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const compact=(value:number)=>new Intl.NumberFormat("pt-BR",{notation:"compact",maximumFractionDigits:1}).format(value);
function Chart({series,labels,description}:{series:{name:string;values:(number|null)[];dashed?:boolean}[];labels:string[];description:string}) {
 const max=Math.max(...series.flatMap(s=>s.values.map(v=>v??0)),1); const x=(i:number)=>64+i*55; const y=(v:number)=>212-v/max*172;
 return <div className="overview-plot"><svg viewBox="0 0 720 260" role="img" aria-label={description}>
 <title>{description}</title><text x="8" y="16" className="overview-axis">R$</text>
 {[0,.5,1].map(t=><g key={t}><line x1="58" x2="690" y1={y(max*t)} y2={y(max*t)} className="overview-gridline"/><text x="48" y={y(max*t)+4} textAnchor="end" className="overview-axis">{compact(max*t)}</text></g>)}
 {labels.map((label,i)=><text key={label} x={x(i)} y="242" textAnchor="middle" className="overview-axis">{label}</text>)}
 {series.map((s,j)=><g key={s.name} className={j===0?"overview-series primary":"overview-series reference"}>{s.values.map((v,i)=>v===null?null:<g key={i}>
 {i>0 && s.values[i-1]!==null && <line x1={x(i-1)} y1={y(s.values[i-1]!)} x2={x(i)} y2={y(v)} strokeDasharray={s.dashed?"6 5":undefined}/>}
 <circle cx={x(i)} cy={y(v)} r={s.dashed?4:5} tabIndex={0} aria-label={`${labels[i]}, ${s.name}: ${formatBRL(v)}`}><title>{labels[i]} · {s.name}: {formatBRL(v)}</title></circle>
 </g>)}</g>)}</svg></div>;
}
function DataTable({series}:{series:{name:string;values:(number|null)[]}[]}) {
 return <details className="overview-data"><summary>Ver valores em tabela</summary><div className="ds-table-region" tabIndex={0} role="region" aria-label="Dados mensais do gráfico"><table className="ds-table"><caption>Valores registrados em reais; ausência não equivale a zero.</caption><thead><tr><th scope="col">Mês</th>{series.map(s=><th scope="col" key={s.name} className="number">{s.name}</th>)}</tr></thead><tbody>{months.map((m,i)=><tr key={m}><th scope="row">{m}</th>{series.map(s=><td key={s.name} className="number">{s.values[i]===null?"Sem dados":formatBRL(s.values[i]!)}</td>)}</tr>)}</tbody></table></div></details>;
}
const values=(rows:MonthTotal[],kind:"income"|"expense")=>rows.map(m=>m.entries ? m[kind] : null);
export function OverviewCharts({story,unavailable}:{story:OverviewStory|null;unavailable:boolean}) {
 const [kind,setKind]=useState<"expense"|"income">("expense");
 if (!story || unavailable) return <section className="ds-panel overview-charts" aria-label="Análise histórica"><h2>Análise histórica indisponível</h2><p>Não foi possível obter o histórico completo. Totais parciais não são exibidos. Tente consultar novamente.</p></section>;
 const {year,current,previous,comparable,categories}=story;
 const trend=[{name:"Receitas",values:values(current,"income")},{name:"Despesas",values:values(current,"expense"),dashed:true}];
 const annual=[{name:String(year),values:values(current,kind)},{name:String(year-1),values:values(previous,kind),dashed:true}];
 const top=categories.slice(0,6);
 if(categories.length>6) top.push({id:"__other",name:"Demais categorias",current:categories.slice(6).reduce((n,c)=>n+c.current,0),previous:categories.slice(6).reduce((n,c)=>n+c.previous,0)});
 const max=Math.max(...top.flatMap(c=>[c.current,c.previous]),1);
 const delta=story.currentTotal[kind]-story.previousTotal[kind];
 const largest=[...categories].sort((a,b)=>Math.abs(b.current-b.previous)-Math.abs(a.current-a.previous))[0];
 const coverage=comparable.length ? `Meses em comum: ${comparable.map(m=>months[m-1]).join(", ")}.` : "Sem meses encerrados no calendário com registros nos dois anos.";
 return <section className="overview-charts" aria-labelledby="overview-history-title">
 <div className="overview-story-heading"><span className="overview-eyebrow">O que mudou nos seus registros</span><h2 id="overview-history-title">Do panorama às diferenças</h2><p>Até {months[story.selectedMonth-1]} de {year} · fonte: lançamentos de Finanças. Dados de importações privadas ainda não publicados não entram nesta leitura.</p></div>
 <div className="overview-chart-grid">
 <article className="ds-panel overview-full"><h3>Como receitas e despesas evoluem no ano</h3><p>A distância entre as linhas mostra o resultado de cada mês, sem representar saldo bancário.{story.partial?" O mês selecionado está em andamento.":""}</p>
 <div className="overview-legend"><span className="primary">Receitas · linha contínua</span><span className="reference">Despesas · linha tracejada</span></div>
 {current.some(m=>m.entries) ? <><Chart series={trend} labels={months} description={`Receitas e despesas registradas em ${year}, até ${months[story.selectedMonth-1]}. Meses sem registros aparecem como lacunas.`}/><DataTable series={trend}/></> : <p>Nenhum lançamento registrado nesse intervalo. Adicione seus registros em Finanças para visualizar a evolução.</p>}
 </article>
 <article className="ds-panel"><h3>{comparable.length ? `${kind==="expense"?"Despesas":"Receitas"}: ${changeLabel(story.currentTotal[kind],story.previousTotal[kind])} do ano anterior` : "Um segundo ano permite comparar a evolução"}</h3>
 <div className="overview-controls" role="group" aria-label="Indicador da comparação anual"><button type="button" aria-pressed={kind==="expense"} onClick={()=>setKind("expense")}>Despesas</button><button type="button" aria-pressed={kind==="income"} onClick={()=>setKind("income")}>Receitas</button></div>
 <p>{coverage} O resumo usa somente esses mesmos meses e exclui o mês em andamento. Cobertura indica presença de registros, não conciliação completa.</p>
 {comparable.length>0 && <p className="overview-callout"><strong>{formatBRL(story.currentTotal[kind])}</strong> em {year} <span>vs. {formatBRL(story.previousTotal[kind])} em {year-1} · diferença de {formatBRL(delta)}</span></p>}
 <div className="overview-legend"><span className="primary">{year} · contínua</span><span className="reference">{year-1} · tracejada</span></div>
 {current.some(m=>m.entries)||previous.some(m=>m.entries) ? <><Chart series={annual} labels={months} description={`Comparação mensal de ${kind==="expense"?"despesas":"receitas"} entre ${year} e ${year-1}. O resumo compara ${comparable.length} meses em comum.`}/><DataTable series={annual}/></> : <p>Sem registros para comparar esses anos.</p>}
 </article>
 <article className="ds-panel"><h3>{largest ? `${largest.name} apresenta a maior diferença em despesas` : "Onde as despesas se concentram"}</h3><p>Mesma base de meses da comparação anual. Categorias ordenadas pelo maior valor entre os dois anos.</p>
 {largest && <p className="overview-callout">Diferença registrada: <strong>{formatBRL(largest.current-largest.previous)}</strong><span>Uma diferença não identifica sua causa. Confira os lançamentos antes de decidir.</span></p>}
 {top.length ? <><div className="overview-category-bars" aria-label="Comparação de despesas por categoria">{top.map(c=><div key={c.id}><strong>{c.name}</strong><div className="overview-bar-row"><span>{year}</span><div className="overview-bar-track"><span className="primary" style={{width:`${c.current/max*100}%`}}/></div><span>{formatBRL(c.current)}</span></div><div className="overview-bar-row"><span>{year-1}</span><div className="overview-bar-track"><span className="reference" style={{width:`${c.previous/max*100}%`}}/></div><span>{formatBRL(c.previous)}</span></div></div>)}</div>
 <details className="overview-data"><summary>Ver todas as categorias em tabela</summary><div className="ds-table-region" role="region" aria-label="Valores por categoria" tabIndex={0}><table className="ds-table"><caption>Despesas nos meses em comum · valores em reais</caption><thead><tr><th scope="col">Categoria</th><th scope="col" className="number">{year}</th><th scope="col" className="number">{year-1}</th><th scope="col" className="number">Diferença</th></tr></thead><tbody>{categories.map(c=><tr key={c.id}><th scope="row">{c.name}</th><td className="number">{formatBRL(c.current)}</td><td className="number">{formatBRL(c.previous)}</td><td className="number">{formatBRL(c.current-c.previous)}</td></tr>)}</tbody></table></div></details></> : <p>{comparable.length ? "Nenhuma despesa registrada nos meses em comum." : "A comparação de categorias estará disponível quando houver meses equivalentes registrados nos dois anos."}</p>}
 </article></div><p className="overview-method">Meses sem lançamentos são lacunas; zero aparece apenas quando há registros no mês e nenhum valor daquele tipo. Datas futuras são excluídas. Valores nominais, sem ajuste de inflação. As leituras não substituem a conciliação nem explicam causas automaticamente.</p>
 </section>;
}
