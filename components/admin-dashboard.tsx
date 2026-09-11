"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronRight, Eye, EyeOff, FolderTree, ImagePlus, Layers, LoaderCircle, LogOut, Package, Pencil, Plus, RefreshCw, ScanText, Settings, Tags, Trash2, Upload, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { emptyProductDraft, slugify, type AdminBrand, type AdminCategory, type AdminProduct, type AdminSubcategory, type ProductDraft } from "@/lib/admin-types";
import { isSupabaseConfigured, supabaseBrowser } from "@/lib/supabase";

type Notice = { tone: "success" | "error"; text: string } | null;
type DeleteTarget = { kind: "products"; ids: string[] } | { kind: "brand" | "category" | "subcategory"; id: string; label: string } | null;
type AiSuggestion = { id: string; name: string; sku: string | null; description: string; confidence: "high" | "medium" | "low"; reason: string; approved: boolean };

export function AdminDashboard() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "setup" | "denied" | "error" | "ready">("loading");
  const [tab, setTab] = useState("Dashboard");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [subcategories, setSubcategories] = useState<AdminSubcategory[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [settings, setSettings] = useState({ whatsapp: "", default_message: "" });
  const [selected, setSelected] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [productOpen, setProductOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProductDraft>(emptyProductDraft);
  const [files, setFiles] = useState<File[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkTaxonomy, setBulkTaxonomy] = useState({ brand_id: "", categoria_id: "", subcategoria_id: "" });
  const [brandName, setBrandName] = useState("");
  const [categoryForm, setCategoryForm] = useState({ brand_id: "", name: "" });
  const [subcategoryForm, setSubcategoryForm] = useState({ category_id: "", name: "" });
  const [importForm, setImportForm] = useState({ url: "", brand_id: "", categoria_id: "", subcategoria_id: "" });
  const [importStatus, setImportStatus] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);

  const notify = useCallback((text: string, tone: "success" | "error" = "success") => {
    setNotice({ text, tone });
    window.setTimeout(() => setNotice(null), 4500);
  }, []);

  const loadData = useCallback(async () => {
    const supabase = supabaseBrowser();
    const [brandRes, categoryRes, subcategoryRes, productRes, settingsRes] = await Promise.all([
      supabase.from("brands").select("id,name,slug").order("name"),
      supabase.from("categories").select("id,brand_id,name,slug").order("name"),
      supabase.from("subcategories").select("id,category_id,name,slug").order("name"),
      supabase.from("products").select("id,name,slug,description,sku,brand_id,categoria_id,subcategoria_id,active,rare,sought,created_at,product_images(id,url,storage_path,sort_order,is_cover)").order("created_at", { ascending: false }),
      supabase.from("store_settings").select("whatsapp,default_message").eq("id", 1).maybeSingle(),
    ]);
    const error = brandRes.error || categoryRes.error || subcategoryRes.error || productRes.error || settingsRes.error;
    if (error) throw error;
    setBrands((brandRes.data || []) as AdminBrand[]);
    setCategories((categoryRes.data || []) as AdminCategory[]);
    setSubcategories((subcategoryRes.data || []) as AdminSubcategory[]);
    setProducts(((productRes.data || []) as unknown as AdminProduct[]).map((product) => ({ ...product, product_images: [...(product.product_images || [])].sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order) })));
    if (settingsRes.data) setSettings(settingsRes.data);
  }, []);

  useEffect(() => {
    async function boot() {
      if (!isSupabaseConfigured()) { setStatus("setup"); return; }
      try {
        const supabase = supabaseBrowser();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace("/login?retorno=/admin"); return; }
        const { data: allowed, error } = await supabase.rpc("has_role", { requested_role: "admin" });
        if (error) throw error;
        if (!allowed) { setStatus("denied"); return; }
        await loadData();
        setStatus("ready");
      } catch (error) {
        notify(error instanceof Error ? error.message : "Não foi possível carregar o painel.", "error");
        setStatus("error");
      }
    }
    void boot();
  }, [loadData, notify, router]);

  const categoryName = (id: string | null) => categories.find((item) => item.id === id)?.name || "Sem categoria";
  const brandNameById = (id: string | null) => brands.find((item) => item.id === id)?.name || "Sem marca";
  const subcategoryName = (id: string | null) => subcategories.find((item) => item.id === id)?.name || "Sem subcategoria";
  const productCategories = useMemo(() => categories.filter((item) => item.brand_id === draft.brand_id), [categories, draft.brand_id]);
  const productSubcategories = useMemo(() => subcategories.filter((item) => item.category_id === draft.categoria_id), [subcategories, draft.categoria_id]);
  const bulkCategories = categories.filter((item) => item.brand_id === bulkTaxonomy.brand_id);
  const bulkSubcategories = subcategories.filter((item) => item.category_id === bulkTaxonomy.categoria_id);
  const importCategories = categories.filter((item) => item.brand_id === importForm.brand_id);
  const importSubcategories = subcategories.filter((item) => item.category_id === importForm.categoria_id);
  const allSelected = products.length > 0 && selected.length === products.length;
  const nav = ["Dashboard", "Produtos", "Importar Yupoo", "Categorias", "Configurações"];
  const dashboardStats = [{ label: "Produtos", value: products.length, Icon: Package }, { label: "Marcas", value: brands.length, Icon: Tags }, { label: "Categorias", value: categories.length, Icon: Layers }, { label: "Subcategorias", value: subcategories.length, Icon: FolderTree }];

  async function perform(action: () => Promise<void>, success: string) {
    setBusy(true);
    try { await action(); await loadData(); notify(success); }
    catch (error) { notify(error instanceof Error ? error.message : "Não foi possível concluir a ação.", "error"); }
    finally { setBusy(false); }
  }

  function openNewProduct() { setEditingId(null); setDraft(emptyProductDraft); setFiles([]); setProductOpen(true); }
  function openEditProduct(product: AdminProduct) {
    setEditingId(product.id);
    setDraft({ name: product.name, slug: product.slug, description: product.description || "", sku: product.sku || "", brand_id: product.brand_id || "", categoria_id: product.categoria_id || "", subcategoria_id: product.subcategoria_id || "", active: product.active, rare: product.rare, sought: product.sought });
    setFiles([]); setProductOpen(true);
  }

  async function saveProduct(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.name.trim() || !draft.slug || !draft.brand_id || !draft.categoria_id || !draft.subcategoria_id) { notify("Preencha nome, slug, marca, categoria e subcategoria.", "error"); return; }
    const invalidFile = files.find((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024);
    if (invalidFile) { notify(`A imagem “${invalidFile.name}” precisa ser JPG, PNG ou WebP e ter no máximo 8 MB.`, "error"); return; }
    await perform(async () => {
      const supabase = supabaseBrowser();
      const payload = { ...draft, name: draft.name.trim(), slug: slugify(draft.slug), description: draft.description.trim(), sku: draft.sku.trim() || null, brand_id: draft.brand_id, categoria_id: draft.categoria_id, subcategoria_id: draft.subcategoria_id, updated_at: new Date().toISOString() };
      const result = editingId ? await supabase.from("products").update(payload).eq("id", editingId).select("id").single() : await supabase.from("products").insert(payload).select("id").single();
      if (result.error) throw result.error;
      const productId = result.data.id as string;
      if (!editingId) setEditingId(productId);
      if (files.length) {
        const existing = products.find((product) => product.id === productId)?.product_images.length || 0;
        for (let index = 0; index < files.length; index += 1) {
          const file = files[index];
          const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
          const path = `${productId}/${Date.now()}-${index}.${extension}`;
          const upload = await supabase.storage.from("products").upload(path, file, { contentType: file.type, upsert: false });
          if (upload.error) throw upload.error;
          const { data: publicUrl } = supabase.storage.from("products").getPublicUrl(path);
          const image = await supabase.from("product_images").insert({ product_id: productId, url: publicUrl.publicUrl, storage_path: path, sort_order: existing + index, is_cover: existing === 0 && index === 0 });
          if (image.error) throw image.error;
        }
      }
      setProductOpen(false); setFiles([]);
    }, editingId ? "Produto atualizado." : "Produto criado.");
  }

  async function deleteImage(productId: string, imageId: string, path: string | null, wasCover: boolean) {
    await perform(async () => {
      const supabase = supabaseBrowser();
      const result = await supabase.from("product_images").delete().eq("id", imageId).eq("product_id", productId);
      if (result.error) throw result.error;
      if (wasCover) {
        const next = products.find((product) => product.id === productId)?.product_images.find((image) => image.id !== imageId);
        if (next) await supabase.from("product_images").update({ is_cover: true }).eq("id", next.id);
      }
      if (path) await supabase.storage.from("products").remove([path]);
    }, "Imagem removida.");
  }

  async function setCover(productId: string, imageId: string) {
    await perform(async () => {
      const supabase = supabaseBrowser();
      const clear = await supabase.from("product_images").update({ is_cover: false }).eq("product_id", productId);
      if (clear.error) throw clear.error;
      const result = await supabase.from("product_images").update({ is_cover: true }).eq("id", imageId);
      if (result.error) throw result.error;
    }, "Imagem de capa atualizada.");
  }

  async function changeVisibility(active: boolean) {
    await perform(async () => {
      const result = await supabaseBrowser().from("products").update({ active, updated_at: new Date().toISOString() }).in("id", selected);
      if (result.error) throw result.error;
      setSelected([]);
    }, active ? "Produtos publicados." : "Produtos ocultados.");
  }

  async function moveProducts(event: React.FormEvent) {
    event.preventDefault();
    if (!bulkTaxonomy.brand_id || !bulkTaxonomy.categoria_id || !bulkTaxonomy.subcategoria_id) { notify("Selecione toda a nova classificação.", "error"); return; }
    await perform(async () => {
      const result = await supabaseBrowser().from("products").update({ ...bulkTaxonomy, updated_at: new Date().toISOString() }).in("id", selected);
      if (result.error) throw result.error;
      setSelected([]); setBulkOpen(false);
    }, "Produtos movidos para a nova categoria.");
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await perform(async () => {
      const supabase = supabaseBrowser();
      if (deleteTarget.kind === "products") {
        const related = products.filter((product) => deleteTarget.ids.includes(product.id)).flatMap((product) => product.product_images.map((image) => image.storage_path).filter(Boolean)) as string[];
        const result = await supabase.from("products").delete().in("id", deleteTarget.ids);
        if (result.error) throw result.error;
        if (related.length) await supabase.storage.from("products").remove(related);
        setSelected([]);
      } else {
        const table = deleteTarget.kind === "brand" ? "brands" : deleteTarget.kind === "category" ? "categories" : "subcategories";
        const result = await supabase.from(table).delete().eq("id", deleteTarget.id);
        if (result.error) throw new Error(result.error.code === "23503" ? "Essa estrutura ainda possui produtos vinculados. Mova ou exclua os produtos primeiro." : result.error.message);
      }
      setDeleteTarget(null);
    }, "Item excluído.");
  }

  async function createBrand(event: React.FormEvent) {
    event.preventDefault(); if (!brandName.trim()) return;
    await perform(async () => { const result = await supabaseBrowser().from("brands").insert({ name: brandName.trim(), slug: slugify(brandName) }); if (result.error) throw result.error; setBrandName(""); }, "Marca criada.");
  }
  async function createCategory(event: React.FormEvent) {
    event.preventDefault(); if (!categoryForm.brand_id || !categoryForm.name.trim()) return;
    await perform(async () => { const result = await supabaseBrowser().from("categories").insert({ brand_id: categoryForm.brand_id, name: categoryForm.name.trim(), slug: slugify(categoryForm.name) }); if (result.error) throw result.error; setCategoryForm({ ...categoryForm, name: "" }); }, "Categoria criada.");
  }
  async function createSubcategory(event: React.FormEvent) {
    event.preventDefault(); if (!subcategoryForm.category_id || !subcategoryForm.name.trim()) return;
    await perform(async () => { const result = await supabaseBrowser().from("subcategories").insert({ category_id: subcategoryForm.category_id, name: subcategoryForm.name.trim(), slug: slugify(subcategoryForm.name) }); if (result.error) throw result.error; setSubcategoryForm({ ...subcategoryForm, name: "" }); }, "Subcategoria criada.");
  }
  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\d{10,15}$/.test(settings.whatsapp)) { notify("Informe o WhatsApp com país e DDD, usando somente números.", "error"); return; }
    await perform(async () => { const result = await supabaseBrowser().from("store_settings").upsert({ id: 1, ...settings }); if (result.error) throw result.error; }, "Configurações salvas.");
  }

  async function runImport(event: React.FormEvent) {
    event.preventDefault();
    if (!importForm.url || !importForm.brand_id || !importForm.categoria_id || !importForm.subcategoria_id) { notify("Informe a URL e a classificação completa.", "error"); return; }
    setBusy(true); setImportStatus("Lendo o Yupoo e preparando as imagens…");
    try {
      const { data: { session } } = await supabaseBrowser().auth.getSession();
      const response = await fetch("/api/admin/import-yupoo", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` }, body: JSON.stringify(importForm) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Falha na importação.");
      setImportStatus(`${result.created} novos · ${result.duplicates} existentes · ${result.failures} falhas`);
      await loadData(); notify("Importação concluída.");
    } catch (error) { setImportStatus(""); notify(error instanceof Error ? error.message : "Falha na importação.", "error"); }
    finally { setBusy(false); }
  }

  async function analyzeProducts() {
    setBusy(true);
    try {
      const chosen = products.filter((product) => selected.includes(product.id)).map(({ id, name, description, sku }) => ({ id, name, description, sku }));
      const { data: { session } } = await supabaseBrowser().auth.getSession();
      const response = await fetch("/api/admin/rename", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` }, body: JSON.stringify({ products: chosen }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível analisar os produtos.");
      setAiSuggestions(result.suggestions.map((item: Omit<AiSuggestion, "approved">) => ({ ...item, approved: item.confidence !== "low" })));
      setAiOpen(true);
    } catch (error) { notify(error instanceof Error ? error.message : "Falha na análise.", "error"); }
    finally { setBusy(false); }
  }

  async function applyAiSuggestions() {
    const approved = aiSuggestions.filter((item) => item.approved);
    if (!approved.length) { notify("Aprove pelo menos uma sugestão.", "error"); return; }
    await perform(async () => {
      const supabase = supabaseBrowser();
      for (const item of approved) {
        const result = await supabase.from("products").update({ name: item.name, slug: `${slugify(item.name)}-${item.id.slice(0, 6)}`, sku: item.sku || null, description: item.description, updated_at: new Date().toISOString() }).eq("id", item.id);
        if (result.error) throw result.error;
      }
      setAiOpen(false); setSelected([]);
    }, `${approved.length} sugestão(ões) aplicada(s).`);
  }

  async function signOut() { await supabaseBrowser().auth.signOut(); router.replace("/login"); }

  if (status === "loading") return <AdminState icon={<LoaderCircle className="spin" />} title="Carregando painel" text="Validando sua sessão e buscando os dados da loja." />;
  if (status === "setup") return <AdminState icon={<Settings />} title="Conecte o Supabase" text="Cadastre NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY na Vercel e execute o arquivo supabase/schema.sql no SQL Editor do seu projeto." />;
  if (status === "error") return <AdminState icon={<RefreshCw />} title="Não foi possível carregar o painel" text="A conexão existe, mas o banco respondeu com erro. Confira se o schema mais recente foi executado e tente novamente." action={<button className="button primary" onClick={() => location.reload()}>TENTAR NOVAMENTE</button>} />;
  if (status === "denied") return <AdminState icon={<EyeOff />} title="Acesso ainda não liberado" text="Sua conta existe, mas não possui o papel admin. Adicione seu usuário à tabela user_roles com o papel admin." action={<button className="button primary" onClick={signOut}>SAIR E USAR OUTRA CONTA</button>} />;

  return <div className="admin-shell" aria-busy={busy}>
    <aside className="admin-side"><BrandLogo /><nav aria-label="Painel administrativo">{nav.map((name) => <button className={tab === name ? "active" : ""} aria-current={tab === name ? "page" : undefined} key={name} onClick={() => setTab(name)}>{name}</button>)}</nav><div className="admin-side-actions"><Link href="/">← Ver loja</Link><button onClick={signOut}><LogOut /> Sair</button></div></aside>
    <main className="admin-main">
      <header><div><p className="eyebrow">PAINEL NORD</p><h1>{tab}</h1></div>{tab === "Produtos" && <button className="button primary" onClick={openNewProduct}><Plus /> NOVO PRODUTO</button>}</header>
      {notice && <div className={`admin-feedback ${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}><span>{notice.text}</span><button aria-label="Fechar mensagem" onClick={() => setNotice(null)}><X /></button></div>}
      {busy && <div className="admin-loading" role="status"><LoaderCircle className="spin" /> Salvando alterações…</div>}

      {tab === "Dashboard" && <><div className="stats">{dashboardStats.map(({ label, value, Icon }) => <div key={label}><Icon /><span>{label}</span><b>{value}</b></div>)}</div><section className="admin-panel dashboard-summary"><h2>Visão geral</h2><div><span><CheckCircle2 /> {products.filter((product) => product.active).length} produtos publicados</span><span><EyeOff /> {products.filter((product) => !product.active).length} produtos ocultos</span><span><ImagePlus /> {products.filter((product) => !product.product_images.length).length} produtos sem imagem</span></div></section></>}

      {tab === "Produtos" && <section className="admin-panel"><div className="bulk"><label className="select-all"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : products.map((product) => product.id))} /> Selecionar todos</label><span>{selected.length} selecionados</span><button disabled={!selected.length} onClick={() => changeVisibility(true)}><Eye /> Publicar</button><button disabled={!selected.length} onClick={() => changeVisibility(false)}><EyeOff /> Ocultar</button><button disabled={!selected.length} onClick={() => setBulkOpen(true)}><Layers /> Mover</button><button className="danger-action" disabled={!selected.length} onClick={() => setDeleteTarget({ kind: "products", ids: selected })}><Trash2 /> Excluir</button></div>
        {products.length ? <div className="admin-list">{products.map((product) => <div className="admin-product-row" key={product.id}><input aria-label={`Selecionar ${product.name}`} type="checkbox" checked={selected.includes(product.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, product.id] : selected.filter((id) => id !== product.id))} /><Image src={product.product_images[0]?.url || "/hero-nord.png"} alt="" width={72} height={72} unoptimized={Boolean(product.product_images[0]?.url?.startsWith("http"))} /><span><b>{product.name}</b><small>{brandNameById(product.brand_id)} · {categoryName(product.categoria_id)} / {subcategoryName(product.subcategoria_id)}</small></span><em className={product.active ? "active" : "hidden"}>{product.active ? "ATIVO" : "OCULTO"}</em><button aria-label={`Editar ${product.name}`} onClick={() => openEditProduct(product)}><Pencil /></button></div>)}</div> : <div className="admin-empty"><Package /><h2>Nenhum produto cadastrado</h2><button className="button primary" onClick={openNewProduct}>CRIAR PRIMEIRO PRODUTO</button></div>}
      </section>}

      {tab === "Importar Yupoo" && <form className="admin-panel import-panel" onSubmit={runImport}><Upload size={36} /><div><h2>Importar do Yupoo</h2><p>Cole a URL de um álbum ou página de categoria. Cada álbum novo vira um produto e as fotos são re-hospedadas.</p></div><label>URL do Yupoo<input className="admin-input" type="url" required value={importForm.url} onChange={(e) => setImportForm({ ...importForm, url: e.target.value })} placeholder="https://...x.yupoo.com/albums/..." /></label><div className="form-row"><label>Marca<select className="admin-input" required value={importForm.brand_id} onChange={(e) => setImportForm({ ...importForm, brand_id: e.target.value, categoria_id: "", subcategoria_id: "" })}><option value="">Selecione</option>{brands.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Categoria<select className="admin-input" required value={importForm.categoria_id} onChange={(e) => setImportForm({ ...importForm, categoria_id: e.target.value, subcategoria_id: "" })}><option value="">Selecione</option>{importCategories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Subcategoria<select className="admin-input" required value={importForm.subcategoria_id} onChange={(e) => setImportForm({ ...importForm, subcategoria_id: e.target.value })}><option value="">Selecione</option>{importSubcategories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label></div><button className="button primary" disabled={busy}><RefreshCw className={busy ? "spin" : ""} /> INICIAR IMPORTAÇÃO</button><div className="progress-card" aria-live="polite"><span>{importStatus || "Pronto para importar"}</span><div><i className={busy ? "running" : ""} /></div></div></form>}

      {tab === "Categorias" && <section className="admin-panel taxonomy-panel"><div className="taxonomy-forms"><form onSubmit={createBrand}><h2>Nova marca</h2><label>Nome<input className="admin-input" value={brandName} onChange={(e) => setBrandName(e.target.value)} required /></label><button className="button primary"><Plus /> ADICIONAR MARCA</button></form><form onSubmit={createCategory}><h2>Nova categoria</h2><label>Marca<select className="admin-input" value={categoryForm.brand_id} onChange={(e) => setCategoryForm({ ...categoryForm, brand_id: e.target.value })} required><option value="">Selecione</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Nome<input className="admin-input" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} required /></label><button className="button primary"><Plus /> ADICIONAR CATEGORIA</button></form><form onSubmit={createSubcategory}><h2>Nova subcategoria</h2><label>Categoria<select className="admin-input" value={subcategoryForm.category_id} onChange={(e) => setSubcategoryForm({ ...subcategoryForm, category_id: e.target.value })} required><option value="">Selecione</option>{categories.map((item) => <option key={item.id} value={item.id}>{brandNameById(item.brand_id)} · {item.name}</option>)}</select></label><label>Nome<input className="admin-input" value={subcategoryForm.name} onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })} required /></label><button className="button primary"><Plus /> ADICIONAR SUBCATEGORIA</button></form></div>
        <div className="taxonomy-tree"><h2>Estrutura da loja</h2>{brands.map((brand) => <details key={brand.id}><summary><span>{brand.name}</span><small>{categories.filter((item) => item.brand_id === brand.id).length} categorias</small><button aria-label={`Excluir marca ${brand.name}`} onClick={(event) => { event.preventDefault(); setDeleteTarget({ kind: "brand", id: brand.id, label: brand.name }); }}><Trash2 /></button></summary>{categories.filter((item) => item.brand_id === brand.id).map((category) => <div className="taxonomy-category" key={category.id}><div><ChevronRight /><b>{category.name}</b><button aria-label={`Excluir categoria ${category.name}`} onClick={() => setDeleteTarget({ kind: "category", id: category.id, label: category.name })}><Trash2 /></button></div>{subcategories.filter((item) => item.category_id === category.id).map((subcategory) => <p key={subcategory.id}><span>{subcategory.name}</span><button aria-label={`Excluir subcategoria ${subcategory.name}`} onClick={() => setDeleteTarget({ kind: "subcategory", id: subcategory.id, label: subcategory.name })}><Trash2 /></button></p>)}</div>)}</details>)}</div>
      </section>}

      {tab === "Configurações" && <form className="admin-panel settings-panel" onSubmit={saveSettings}><Settings /><div><h2>Contato</h2><p>Esses dados passam a ser usados nos botões de conversão da loja.</p></div><label>Número do WhatsApp<input className="admin-input" inputMode="numeric" value={settings.whatsapp} onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value.replace(/\D/g, "") })} required /><small>País + DDD + número, somente dígitos.</small></label><label>Mensagem padrão<textarea className="admin-input" rows={4} value={settings.default_message} onChange={(e) => setSettings({ ...settings, default_message: e.target.value })} required /></label><button className="button primary">SALVAR CONFIGURAÇÕES</button></form>}

      <section className="ai-card"><ScanText /><div><b>Renomeação inteligente</b><p>Selecione produtos para extrair SKU, identificar o modelo e preparar descrições.</p></div><button disabled={!selected.length || busy} onClick={analyzeProducts}>ANALISAR {selected.length || ""} PEÇAS</button></section>
    </main>

    <Dialog open={productOpen} onOpenChange={setProductOpen}><DialogContent className="admin-dialog product-dialog"><DialogHeader><DialogTitle>{editingId ? "Editar produto" : "Novo produto"}</DialogTitle><DialogDescription>Preencha a classificação e escolha as imagens da peça.</DialogDescription></DialogHeader><form id="product-form" onSubmit={saveProduct} className="product-form"><div className="form-row"><label>Nome<input className="admin-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value, slug: editingId ? draft.slug : slugify(e.target.value) })} required /></label><label>Slug<input className="admin-input" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })} required /></label></div><label>Descrição<textarea className="admin-input" rows={5} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label><label>SKU<input className="admin-input" value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} /></label><div className="form-row taxonomy-selects"><label>Marca<select className="admin-input" value={draft.brand_id} onChange={(e) => setDraft({ ...draft, brand_id: e.target.value, categoria_id: "", subcategoria_id: "" })} required><option value="">Selecione</option>{brands.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Categoria<select className="admin-input" value={draft.categoria_id} onChange={(e) => setDraft({ ...draft, categoria_id: e.target.value, subcategoria_id: "" })} required disabled={!draft.brand_id}><option value="">Selecione</option>{productCategories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Subcategoria<select className="admin-input" value={draft.subcategoria_id} onChange={(e) => setDraft({ ...draft, subcategoria_id: e.target.value })} required disabled={!draft.categoria_id}><option value="">Selecione</option>{productSubcategories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label></div><fieldset className="product-switches"><legend>Exibição</legend><label><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Produto ativo</label><label><input type="checkbox" checked={draft.sought} onChange={(e) => setDraft({ ...draft, sought: e.target.checked })} /> Mais procurado</label><label><input type="checkbox" checked={draft.rare} onChange={(e) => setDraft({ ...draft, rare: e.target.checked })} /> Achado raro</label></fieldset>{editingId && products.find((product) => product.id === editingId)?.product_images.length ? <div className="image-manager">{products.find((product) => product.id === editingId)!.product_images.map((image) => <div key={image.id}><Image src={image.url} alt="" width={92} height={92} unoptimized /><button type="button" onClick={() => setCover(editingId, image.id)} disabled={image.is_cover}>{image.is_cover ? "Capa" : "Definir capa"}</button><button type="button" className="danger-text" onClick={() => deleteImage(editingId, image.id, image.storage_path, image.is_cover)}>Remover</button></div>)}</div> : null}<label className="file-drop"><ImagePlus /><span>Adicionar imagens</span><small>JPG, PNG ou WebP. A primeira imagem será a capa.</small><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} /></label>{files.length > 0 && <p className="file-count">{files.length} {files.length === 1 ? "imagem selecionada" : "imagens selecionadas"}</p>}</form><DialogFooter><button className="button" type="button" onClick={() => setProductOpen(false)}>CANCELAR</button><button className="button primary" type="submit" form="product-form" disabled={busy}>SALVAR PRODUTO</button></DialogFooter></DialogContent></Dialog>

    <Dialog open={bulkOpen} onOpenChange={setBulkOpen}><DialogContent className="admin-dialog"><DialogHeader><DialogTitle>Mover {selected.length} produtos</DialogTitle><DialogDescription>Escolha a nova marca, categoria e subcategoria.</DialogDescription></DialogHeader><form id="bulk-form" onSubmit={moveProducts} className="product-form"><label>Marca<select className="admin-input" value={bulkTaxonomy.brand_id} onChange={(e) => setBulkTaxonomy({ brand_id: e.target.value, categoria_id: "", subcategoria_id: "" })} required><option value="">Selecione</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Categoria<select className="admin-input" value={bulkTaxonomy.categoria_id} onChange={(e) => setBulkTaxonomy({ ...bulkTaxonomy, categoria_id: e.target.value, subcategoria_id: "" })} disabled={!bulkTaxonomy.brand_id} required><option value="">Selecione</option>{bulkCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Subcategoria<select className="admin-input" value={bulkTaxonomy.subcategoria_id} onChange={(e) => setBulkTaxonomy({ ...bulkTaxonomy, subcategoria_id: e.target.value })} disabled={!bulkTaxonomy.categoria_id} required><option value="">Selecione</option>{bulkSubcategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></form><DialogFooter><button className="button" onClick={() => setBulkOpen(false)}>CANCELAR</button><button className="button primary" type="submit" form="bulk-form">MOVER PRODUTOS</button></DialogFooter></DialogContent></Dialog>

    <Dialog open={aiOpen} onOpenChange={setAiOpen}><DialogContent className="admin-dialog ai-dialog"><DialogHeader><DialogTitle>Revisar sugestões da IA</DialogTitle><DialogDescription>Nada é salvo sem sua aprovação. Confira principalmente itens de confiança média ou baixa.</DialogDescription></DialogHeader><div className="ai-suggestions">{aiSuggestions.map((item, index) => <article key={item.id}><label className="ai-approve"><input type="checkbox" checked={item.approved} onChange={(event) => setAiSuggestions((current) => current.map((entry, position) => position === index ? { ...entry, approved: event.target.checked } : entry))} /> Aprovar esta alteração</label><span className={`confidence ${item.confidence}`}>{item.confidence === "high" ? "Confiança alta" : item.confidence === "medium" ? "Confiança média" : "Confiança baixa"}</span><label>Nome sugerido<input className="admin-input" value={item.name} onChange={(event) => setAiSuggestions((current) => current.map((entry, position) => position === index ? { ...entry, name: event.target.value } : entry))} /></label><label>SKU<input className="admin-input" value={item.sku || ""} onChange={(event) => setAiSuggestions((current) => current.map((entry, position) => position === index ? { ...entry, sku: event.target.value } : entry))} /></label><label>Descrição<textarea className="admin-input" rows={4} value={item.description} onChange={(event) => setAiSuggestions((current) => current.map((entry, position) => position === index ? { ...entry, description: event.target.value } : entry))} /></label><small>{item.reason}</small></article>)}</div><DialogFooter><button className="button" onClick={() => setAiOpen(false)}>CANCELAR</button><button className="button primary" onClick={applyAiSuggestions}>SALVAR APROVADOS</button></DialogFooter></DialogContent></Dialog>

    <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}><AlertDialogContent className="admin-dialog"><AlertDialogHeader><AlertDialogTitle>Confirmar exclusão?</AlertDialogTitle><AlertDialogDescription>{deleteTarget?.kind === "products" ? `Você excluirá ${deleteTarget.ids.length} produto(s), incluindo suas imagens.` : `Você excluirá “${deleteTarget?.label}”. Estruturas que ainda possuem produtos vinculados não podem ser apagadas.`}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={confirmDelete}>Excluir definitivamente</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

function AdminState({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) {
  return <main className="admin-state"><BrandLogo /><div>{icon}<h1>{title}</h1><p>{text}</p>{action}</div><Link href="/">← Voltar para a loja</Link></main>;
}
