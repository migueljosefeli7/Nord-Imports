"use client";

import { useState } from "react";
import { Eye, FolderTree, Layers, Package, Plus, RefreshCw, ScanText, Settings, Tags, Trash2, Upload, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { products, brands, categories } from "@/lib/data";

export function AdminDashboard() {
  const [tab, setTab] = useState("Dashboard");
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const nav = ["Dashboard", "Produtos", "Importar Yupoo", "Categorias", "Configurações"];
  const allSelected = selected.length === products.length;
  function confirmAction(message: string) { setFeedback(message); window.setTimeout(() => setFeedback(""), 3500); }

  return <div className="admin-shell">
    <aside className="admin-side"><BrandLogo /><nav aria-label="Painel administrativo">{nav.map((n) => <button className={tab === n ? "active" : ""} aria-current={tab === n ? "page" : undefined} key={n} onClick={() => setTab(n)}>{n}</button>)}</nav><a href="/">← Ver loja</a></aside>
    <main className="admin-main">
      <header><div><p className="eyebrow">PAINEL NORD</p><h1>{tab}</h1></div>{tab === "Produtos" && <button className="button primary"><Plus aria-hidden="true" /> NOVO PRODUTO</button>}</header>
      {feedback && <div className="admin-feedback" role="status"><span>{feedback}</span><button aria-label="Fechar mensagem" onClick={() => setFeedback("")}><X /></button></div>}

      {tab === "Dashboard" && <><div className="stats">{[["Produtos", products.length, Package], ["Marcas", brands.length, Tags], ["Categorias", categories.length, Layers], ["Subcategorias", new Set(products.map((p) => p.subcategory)).size, FolderTree]].map(([label, value, Icon]: any) => <div key={label}><Icon aria-hidden="true" /><span>{label}</span><b>{value}</b></div>)}</div><section className="admin-panel"><h2>Visão geral</h2><p>Produtos ativos aparecem na vitrine pública. Use a seção Produtos para organizar e publicar sua curadoria.</p></section></>}

      {tab === "Produtos" && <section className="admin-panel"><div className="bulk"><label className="select-all"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : products.map((p) => p.id))} /> Selecionar todos</label><span>{selected.length} selecionados</span><button disabled={!selected.length} onClick={() => confirmAction("Visibilidade atualizada.")}><Eye /> Publicar/ocultar</button><button disabled={!selected.length} onClick={() => confirmAction("Escolha a nova categoria no formulário de edição.")}><Layers /> Mover categoria</button><AlertDialog><AlertDialogTrigger asChild><button className="danger-action" disabled={!selected.length}><Trash2 /> Excluir</button></AlertDialogTrigger><AlertDialogContent className="admin-dialog"><AlertDialogHeader><AlertDialogTitle>Excluir produtos selecionados?</AlertDialogTitle><AlertDialogDescription>Essa ação removerá {selected.length} {selected.length === 1 ? "produto" : "produtos"}. Ela não poderá ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => { setSelected([]); confirmAction("Produtos removidos."); }}>Excluir produtos</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div><div className="admin-list">{products.map((p) => <label key={p.id}><input type="checkbox" checked={selected.includes(p.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, p.id] : selected.filter((x) => x !== p.id))} /><img src={p.image} alt="" /><span><b>{p.name}</b><small>{p.brand} · {p.category} / {p.subcategory}</small></span><em>{p.active ? "ATIVO" : "OCULTO"}</em></label>)}</div></section>}

      {tab === "Importar Yupoo" && <section className="admin-panel import-panel"><Upload size={36} aria-hidden="true" /><div><h2>Importar do Yupoo</h2><p>Cole a URL de um álbum ou categoria. Antes de iniciar, confirme a marca e a categoria de destino.</p></div><label>URL do Yupoo<input className="admin-input" type="url" placeholder="https://...x.yupoo.com/albums/..." /></label><div className="form-row"><label>Marca<select className="admin-input"><option value="">Selecione</option>{brands.map((b) => <option key={b}>{b}</option>)}</select></label><label>Categoria<select className="admin-input"><option value="">Selecione</option>{categories.map((c) => <option key={c}>{c}</option>)}</select></label></div><button className="button primary"><RefreshCw aria-hidden="true" /> INICIAR IMPORTAÇÃO</button><div className="progress-card" aria-live="polite"><span>Pronto para importar</span><b>0 novos · 0 existentes · 0 falhas</b><div><i /></div></div></section>}

      {tab === "Categorias" && <section className="admin-panel"><h2>Marca → Categoria → Subcategoria</h2><p className="admin-help">Abra uma marca para visualizar sua estrutura.</p>{brands.slice(0, 5).map((b) => <details key={b}><summary>{b}</summary>{[...new Set(products.filter((p) => p.brand === b).map((p) => p.category))].map((c) => <p key={c}>↳ {c} <small>{products.filter((p) => p.brand === b && p.category === c).map((p) => p.subcategory).join(", ")}</small></p>)}</details>)}</section>}

      {tab === "Configurações" && <section className="admin-panel settings-panel"><Settings aria-hidden="true" /><div><h2>Contato</h2><p>Esses dados serão usados nos botões de conversão da loja.</p></div><label>Número do WhatsApp<input className="admin-input" inputMode="tel" defaultValue="5511999999999" /><small>Inclua o código do país e DDD, somente números.</small></label><label>Mensagem padrão<textarea className="admin-input" rows={4} defaultValue="Olá! Tenho interesse em uma peça da Nord Imports:" /></label><button className="button primary" onClick={() => confirmAction("Configurações salvas.")}>SALVAR CONFIGURAÇÕES</button></section>}

      <section className="ai-card"><ScanText aria-hidden="true" /><div><b>Renomeação inteligente</b><p>Selecione produtos para extrair SKU, identificar modelo e gerar descrições com contexto.</p></div><button disabled={!selected.length}>ANALISAR {selected.length || ""} PEÇAS</button></section>
    </main>
  </div>;
}
