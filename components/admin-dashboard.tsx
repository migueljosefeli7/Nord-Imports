"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  FolderTree,
  GripVertical,
  ImagePlus,
  Layers,
  LoaderCircle,
  LogOut,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Settings,
  Tags,
  Trash2,
  Upload,
  ExternalLink,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  emptyProductDraft,
  slugify,
  type AdminBrand,
  type AdminCategory,
  type AdminProduct,
  type AdminSubcategory,
  type ProductDraft,
} from "@/lib/admin-types";
import { isSupabaseConfigured, supabaseBrowser } from "@/lib/supabase";
import { isVideoUrl } from "@/lib/media";

type Notice = { tone: "success" | "error"; text: string } | null;
type ImportAlbum = { url: string; title: string; image: string | null; selected: boolean };
type TaxonomyEdit = { kind: "category" | "subcategory"; id: string; name: string } | null;
type DeleteTarget =
  | { kind: "products"; ids: string[] }
  | { kind: "brand" | "category" | "subcategory"; id: string; label: string }
  | null;

function isYupooListingLink(value: string) {
  try {
    const url = new URL(value);
    const isYupoo = url.hostname === "yupoo.com" || url.hostname.endsWith(".yupoo.com");
    return isYupoo && !/\/albums\/\d+/i.test(url.pathname);
  } catch {
    return false;
  }
}

async function squareImageFile(file: File) {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    if (bitmap.width === bitmap.height) {
      bitmap.close();
      return file;
    }
    const longestSide = Math.max(bitmap.width, bitmap.height);
    const side = Math.min(longestSide, 2400);
    const scale = side / longestSide;
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = side;
    canvas.height = side;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.fillStyle = "#f1f2ef";
    context.fillRect(0, 0, side, side);
    context.drawImage(bitmap, (side - width) / 2, (side - height) / 2, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.92));
    return blob ? new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-1x1.webp`, { type: "image/webp" }) : file;
  } catch {
    return file;
  }
}

export function AdminDashboard() {
  const router = useRouter();
  const [status, setStatus] = useState<
    "loading" | "setup" | "denied" | "error" | "ready"
  >("loading");
  const [tab, setTab] = useState("Dashboard");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [subcategories, setSubcategories] = useState<AdminSubcategory[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [settings, setSettings] = useState({
    whatsapp: "",
    default_message: "",
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [productOpen, setProductOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProductDraft>(emptyProductDraft);
  const [files, setFiles] = useState<File[]>([]);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkTaxonomy, setBulkTaxonomy] = useState({
    brand_id: "",
    categoria_id: "",
    subcategoria_id: "",
  });
  const [brandName, setBrandName] = useState("");
  const [brandLogoFile, setBrandLogoFile] = useState<File | null>(null);
  const [categoryForm, setCategoryForm] = useState({ brand_id: "", name: "" });
  const [subcategoryForm, setSubcategoryForm] = useState({
    category_id: "",
    name: "",
  });
  const [taxonomyEdit, setTaxonomyEdit] = useState<TaxonomyEdit>(null);
  const [importForm, setImportForm] = useState({
    urls: "",
    brand_id: "",
    categoria_id: "",
    subcategoria_id: "",
  });
  const [importStatus, setImportStatus] = useState("");
  const [importErrors, setImportErrors] = useState<{ url: string; message: string }[]>([]);
  const [importAlbums, setImportAlbums] = useState<ImportAlbum[]>([]);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [importProgress, setImportProgress] = useState({
    state: "idle" as "idle" | "running" | "done" | "error",
    percent: 0,
    phase: 0,
    elapsed: 0,
    total: 0,
    created: 0,
    duplicates: 0,
    failures: 0,
  });

  const notify = useCallback(
    (text: string, tone: "success" | "error" = "success") => {
      setNotice({ text, tone });
      window.setTimeout(() => setNotice(null), 4500);
    },
    [],
  );

  const loadData = useCallback(async () => {
    const supabase = supabaseBrowser();
    const [brandRes, categoryRes, subcategoryRes, productRes, settingsRes, productBrandsRes] =
      await Promise.all([
        supabase.from("brands").select("id,name,slug,logo_url").order("name"),
        supabase
          .from("categories")
          .select("id,brand_id,name,slug")
          .order("name"),
        supabase
          .from("subcategories")
          .select("id,category_id,name,slug")
          .order("name"),
        supabase
          .from("products")
          .select(
            "id,name,slug,description,sku,price,show_price,brand_id,categoria_id,subcategoria_id,active,rare,sought,yupoo_album_url,created_at,product_images(id,url,storage_path,sort_order,is_cover)",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("store_settings")
          .select("whatsapp,default_message")
          .eq("id", 1)
          .maybeSingle(),
        supabase.from("product_brands").select("product_id,brand_id"),
      ]);
    const error =
      brandRes.error ||
      categoryRes.error ||
      subcategoryRes.error ||
      productRes.error ||
      settingsRes.error;
    if (error) throw error;
    setBrands((brandRes.data || []) as AdminBrand[]);
    setCategories((categoryRes.data || []) as AdminCategory[]);
    setSubcategories((subcategoryRes.data || []) as AdminSubcategory[]);
    const collaboratorMap = new Map<string, string[]>();
    for (const link of productBrandsRes.data || []) {
      collaboratorMap.set(link.product_id, [...(collaboratorMap.get(link.product_id) || []), link.brand_id]);
    }
    setProducts(
      ((productRes.data || []) as unknown as AdminProduct[]).map((product) => ({
        ...product,
        collaborator_brand_ids: collaboratorMap.get(product.id) || [],
        product_images: [...(product.product_images || [])].sort(
          (a, b) =>
            Number(b.is_cover) - Number(a.is_cover) ||
            a.sort_order - b.sort_order,
        ),
      })),
    );
    if (settingsRes.data) setSettings(settingsRes.data);
  }, []);

  useEffect(() => {
    async function boot() {
      if (!isSupabaseConfigured()) {
        setStatus("setup");
        return;
      }
      try {
        const supabase = supabaseBrowser();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/login?retorno=/admin");
          return;
        }
        const { data: allowed, error } = await supabase.rpc("has_role", {
          requested_role: "admin",
        });
        if (error) throw error;
        if (!allowed) {
          setStatus("denied");
          return;
        }
        await loadData();
        setStatus("ready");
      } catch (error) {
        notify(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o painel.",
          "error",
        );
        setStatus("error");
      }
    }
    void boot();
  }, [loadData, notify, router]);

  const categoryName = (id: string | null) =>
    categories.find((item) => item.id === id)?.name || "Sem categoria";
  const brandNameById = (id: string | null) =>
    brands.find((item) => item.id === id)?.name || "Sem marca";
  const subcategoryName = (id: string | null) =>
    subcategories.find((item) => item.id === id)?.name || "Sem subcategoria";
  const productCategories = useMemo(
    () => categories.filter((item) => item.brand_id === draft.brand_id),
    [categories, draft.brand_id],
  );
  const productSubcategories = useMemo(
    () =>
      subcategories.filter((item) => item.category_id === draft.categoria_id),
    [subcategories, draft.categoria_id],
  );
  const bulkCategories = categories.filter(
    (item) => item.brand_id === bulkTaxonomy.brand_id,
  );
  const bulkSubcategories = subcategories.filter(
    (item) => item.category_id === bulkTaxonomy.categoria_id,
  );
  const importCategories = categories.filter(
    (item) => item.brand_id === importForm.brand_id,
  );
  const importSubcategories = subcategories.filter(
    (item) => item.category_id === importForm.categoria_id,
  );
  const importLinks = importForm.urls.split(/\s+/).map((url) => url.trim()).filter(Boolean);
  const hasYupooListing = importLinks.some(isYupooListingLink);
  const allSelected =
    products.length > 0 && selected.length === products.length;
  const nav = [
    "Dashboard",
    "Produtos",
    "Importar Yupoo",
    "Categorias",
    "Configurações",
  ];
  const dashboardStats = [
    { label: "Produtos", value: products.length, Icon: Package },
    { label: "Marcas", value: brands.length, Icon: Tags },
    { label: "Categorias", value: categories.length, Icon: Layers },
    { label: "Subcategorias", value: subcategories.length, Icon: FolderTree },
  ];
  const editingProduct = editingId
    ? products.find((product) => product.id === editingId)
    : undefined;
  const coverMedia =
    editingProduct?.product_images.find((image) => image.is_cover) ||
    editingProduct?.product_images[0];

  async function perform(action: () => Promise<void>, success: string) {
    setBusy(true);
    try {
      await action();
      await loadData();
      notify(success);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : typeof error === "object" && error && "message" in error
          ? String(error.message)
          : "Não foi possível concluir a ação.";
      notify(
        message,
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  function openNewProduct() {
    setEditingId(null);
    setDraft(emptyProductDraft);
    setFiles([]);
    setProductOpen(true);
  }
  function openEditProduct(product: AdminProduct) {
    setEditingId(product.id);
    setDraft({
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      sku: product.sku || "",
      price: product.price == null ? "" : String(product.price),
      show_price: product.show_price,
      brand_id: product.brand_id || "",
      collaborator_brand_ids: product.collaborator_brand_ids || [],
      categoria_id: product.categoria_id || "",
      subcategoria_id: product.subcategoria_id || "",
      active: product.active,
      rare: product.rare,
      sought: product.sought,
      yupoo_album_url: product.yupoo_album_url || "",
    });
    setFiles([]);
    setProductOpen(true);
  }

  async function saveProduct(event: React.FormEvent) {
    event.preventDefault();
    if (
      !draft.name.trim() ||
      !draft.slug ||
      !draft.brand_id ||
      !draft.categoria_id ||
      !draft.subcategoria_id
    ) {
      notify("Preencha nome, slug, marca, categoria e subcategoria.", "error");
      return;
    }
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "video/quicktime"];
    const invalidFile = files.find((file) => !allowedTypes.includes(file.type) || file.size > (file.type.startsWith("video/") ? 45 : 8) * 1024 * 1024);
    if (invalidFile) {
      notify(
        `O arquivo “${invalidFile.name}” precisa ser uma foto JPG, PNG ou WebP (até 8 MB), ou vídeo MP4, WebM ou MOV (até 45 MB).`,
        "error",
      );
      return;
    }
    await perform(
      async () => {
        const supabase = supabaseBrowser();
        const payload = {
          name: draft.name.trim(),
          slug: slugify(draft.slug),
          description: draft.description.trim(),
          sku: draft.sku.trim() || null,
          price: draft.price ? Number(draft.price.replace(",", ".")) : null,
          show_price: Boolean(draft.price),
          brand_id: draft.brand_id,
          categoria_id: draft.categoria_id,
          subcategoria_id: draft.subcategoria_id,
          active: draft.active,
          rare: draft.rare,
          sought: draft.sought,
          yupoo_album_url: draft.yupoo_album_url.trim() || null,
          updated_at: new Date().toISOString(),
        };
        const result = editingId
          ? await supabase
              .from("products")
              .update(payload)
              .eq("id", editingId)
              .select("id")
              .single()
          : await supabase
              .from("products")
              .insert(payload)
              .select("id")
              .single();
        if (result.error) throw result.error;
        const productId = result.data.id as string;
        if (!editingId) setEditingId(productId);
        const collaboratorIds = draft.collaborator_brand_ids.filter((brandId) => brandId !== draft.brand_id);
        const { data: { session } } = await supabase.auth.getSession();
        const collaborationResponse = await fetch("/api/admin/product-brands", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
          body: JSON.stringify({ productId, brandIds: collaboratorIds }),
        });
        const collaborationResult = await collaborationResponse.json();
        if (!collaborationResponse.ok) throw new Error(collaborationResult.error || "Não foi possível salvar as marcas da colaboração.");
        if (files.length) {
          const existing =
            products.find((product) => product.id === productId)?.product_images
              .length || 0;
          let hasCover = Boolean(products.find((product) => product.id === productId)?.product_images.some((item) => item.is_cover && !isVideoUrl(item.url)));
          for (let index = 0; index < files.length; index += 1) {
            const file = await squareImageFile(files[index]);
            const extension =
              file.name
                .split(".")
                .pop()
                ?.toLowerCase()
                .replace(/[^a-z0-9]/g, "") || "jpg";
            const path = `${productId}/${Date.now()}-${index}.${extension}`;
            const upload = await supabase.storage
              .from("products")
              .upload(path, file, { contentType: file.type, upsert: false });
            if (upload.error) throw upload.error;
            const { data: publicUrl } = supabase.storage
              .from("products")
              .getPublicUrl(path);
            const image = await supabase
              .from("product_images")
              .insert({
                product_id: productId,
                url: publicUrl.publicUrl,
                storage_path: path,
                sort_order: existing + index,
                is_cover: !hasCover && file.type.startsWith("image/"),
              });
            if (image.error) throw image.error;
            if (file.type.startsWith("image/")) hasCover = true;
          }
        }
        setProductOpen(false);
        setFiles([]);
      },
      editingId ? "Produto atualizado." : "Produto criado.",
    );
  }

  async function deleteImage(
    productId: string,
    imageId: string,
    path: string | null,
    wasCover: boolean,
  ) {
    await perform(async () => {
      const supabase = supabaseBrowser();
      const result = await supabase
        .from("product_images")
        .delete()
        .eq("id", imageId)
        .eq("product_id", productId);
      if (result.error) throw result.error;
      if (wasCover) {
        const next = products
          .find((product) => product.id === productId)
          ?.product_images.find((image) => image.id !== imageId && !isVideoUrl(image.url));
        if (next)
          await supabase
            .from("product_images")
            .update({ is_cover: true })
            .eq("id", next.id);
      }
      if (path) await supabase.storage.from("products").remove([path]);
    }, "Imagem removida.");
  }

  async function setCover(productId: string, imageId: string) {
    await perform(async () => {
      const supabase = supabaseBrowser();
      const clear = await supabase
        .from("product_images")
        .update({ is_cover: false })
        .eq("product_id", productId);
      if (clear.error) throw clear.error;
      const result = await supabase
        .from("product_images")
        .update({ is_cover: true })
        .eq("id", imageId);
      if (result.error) throw result.error;
    }, "Imagem de capa atualizada.");
  }

  async function reorderImages(productId: string, targetImageId: string) {
    if (!draggedImageId || draggedImageId === targetImageId) return;
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    const reordered = [...product.product_images];
    const from = reordered.findIndex((image) => image.id === draggedImageId);
    const to = reordered.findIndex((image) => image.id === targetImageId);
    if (from < 0 || to < 0) return;
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    const firstImageId = reordered.find((image) => !isVideoUrl(image.url))?.id;
    const normalized = reordered.map((image, index) => ({ ...image, sort_order: index, is_cover: image.id === firstImageId }));
    setDraggedImageId(null);
    setProducts((current) => current.map((item) => item.id === productId ? { ...item, product_images: normalized } : item));
    await perform(async () => {
      const supabase = supabaseBrowser();
      for (const image of normalized) {
        const result = await supabase.from("product_images").update({ sort_order: image.sort_order, is_cover: image.is_cover }).eq("id", image.id).eq("product_id", productId);
        if (result.error) throw result.error;
      }
    }, "Ordem das fotos atualizada.");
  }

  async function changeVisibility(active: boolean) {
    await perform(
      async () => {
        const result = await supabaseBrowser()
          .from("products")
          .update({ active, updated_at: new Date().toISOString() })
          .in("id", selected);
        if (result.error) throw result.error;
        setSelected([]);
      },
      active ? "Produtos publicados." : "Produtos ocultados.",
    );
  }

  async function moveProducts(event: React.FormEvent) {
    event.preventDefault();
    if (
      !bulkTaxonomy.brand_id ||
      !bulkTaxonomy.categoria_id ||
      !bulkTaxonomy.subcategoria_id
    ) {
      notify("Selecione toda a nova classificação.", "error");
      return;
    }
    await perform(async () => {
      const result = await supabaseBrowser()
        .from("products")
        .update({ ...bulkTaxonomy, updated_at: new Date().toISOString() })
        .in("id", selected);
      if (result.error) throw result.error;
      setSelected([]);
      setBulkOpen(false);
    }, "Classificação atualizada em todos os produtos selecionados.");
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await perform(async () => {
      const supabase = supabaseBrowser();
      if (deleteTarget.kind === "products") {
        const related = products
          .filter((product) => deleteTarget.ids.includes(product.id))
          .flatMap((product) =>
            product.product_images
              .map((image) => image.storage_path)
              .filter(Boolean),
          ) as string[];
        const result = await supabase
          .from("products")
          .delete()
          .in("id", deleteTarget.ids);
        if (result.error) throw result.error;
        if (related.length)
          await supabase.storage.from("products").remove(related);
        setSelected([]);
      } else {
        const table =
          deleteTarget.kind === "brand"
            ? "brands"
            : deleteTarget.kind === "category"
              ? "categories"
              : "subcategories";
        const result = await supabase
          .from(table)
          .delete()
          .eq("id", deleteTarget.id);
        if (result.error)
          throw new Error(
            result.error.code === "23503"
              ? "Essa estrutura ainda possui produtos vinculados. Mova ou exclua os produtos primeiro."
              : result.error.message,
          );
      }
      setDeleteTarget(null);
    }, "Item excluído.");
  }

  async function createBrand(event: React.FormEvent) {
    event.preventDefault();
    if (!brandName.trim()) return;
    await perform(async () => {
      const supabase = supabaseBrowser();
      const result = await supabase
        .from("brands")
        .insert({ name: brandName.trim(), slug: slugify(brandName) })
        .select("id")
        .single();
      if (result.error) throw result.error;
      if (brandLogoFile) await uploadBrandLogo(result.data.id, brandLogoFile);
      setBrandName("");
      setBrandLogoFile(null);
    }, "Marca criada.");
  }

  async function uploadBrandLogo(brandId: string, file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error("O logo precisa ser JPG, PNG ou WebP e ter no máximo 5 MB.");
    const supabase = supabaseBrowser();
    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `brands/${brandId}-${crypto.randomUUID()}.${extension}`;
    const upload = await supabase.storage.from("products").upload(path, file, { contentType: file.type, upsert: true });
    if (upload.error) throw upload.error;
    const { data } = supabase.storage.from("products").getPublicUrl(path);
    const update = await supabase.from("brands").update({ logo_url: data.publicUrl }).eq("id", brandId);
    if (update.error) throw update.error;
  }

  async function replaceBrandLogo(brandId: string, file?: File) {
    if (!file) return;
    await perform(() => uploadBrandLogo(brandId, file), "Logo da marca atualizado.");
  }
  async function createCategory(event: React.FormEvent) {
    event.preventDefault();
    if (!categoryForm.brand_id || !categoryForm.name.trim()) return;
    await perform(async () => {
      const result = await supabaseBrowser()
        .from("categories")
        .insert({
          brand_id: categoryForm.brand_id,
          name: categoryForm.name.trim(),
          slug: slugify(categoryForm.name),
        });
      if (result.error) throw result.error;
      setCategoryForm({ ...categoryForm, name: "" });
    }, "Categoria criada.");
  }
  async function createSubcategory(event: React.FormEvent) {
    event.preventDefault();
    if (!subcategoryForm.category_id || !subcategoryForm.name.trim()) return;
    await perform(async () => {
      const result = await supabaseBrowser()
        .from("subcategories")
        .insert({
          category_id: subcategoryForm.category_id,
          name: subcategoryForm.name.trim(),
          slug: slugify(subcategoryForm.name),
        });
      if (result.error) throw result.error;
      setSubcategoryForm({ ...subcategoryForm, name: "" });
    }, "Subcategoria criada.");
  }

  async function renameTaxonomy(event: React.FormEvent) {
    event.preventDefault();
    if (!taxonomyEdit?.name.trim()) return;
    const current = taxonomyEdit;
    await perform(async () => {
      const table = current.kind === "category" ? "categories" : "subcategories";
      const result = await supabaseBrowser().from(table).update({ name: current.name.trim(), slug: slugify(current.name) }).eq("id", current.id);
      if (result.error) throw new Error(result.error.code === "23505" ? "Já existe um item com esse nome nesta estrutura." : result.error.message);
      setTaxonomyEdit(null);
    }, current.kind === "category" ? "Categoria renomeada." : "Subcategoria renomeada.");
  }
  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\d{10,15}$/.test(settings.whatsapp)) {
      notify(
        "Informe o WhatsApp com país e DDD, usando somente números.",
        "error",
      );
      return;
    }
    await perform(async () => {
      const result = await supabaseBrowser()
        .from("store_settings")
        .upsert({ id: 1, ...settings });
      if (result.error) throw result.error;
    }, "Configurações salvas.");
  }

  async function runImport(event: React.FormEvent) {
    event.preventDefault();
    const typedUrls = importForm.urls.split(/\s+/).map((url) => url.trim()).filter(Boolean);
    if (typedUrls.some(isYupooListingLink) && !importAlbums.length) {
      notify("Primeiro carregue a página do Yupoo e escolha os álbuns.", "error");
      return;
    }
    const urls = importAlbums.length ? importAlbums.filter((album) => album.selected).map((album) => album.url) : typedUrls;
    if (
      !urls.length ||
      !importForm.brand_id ||
      !importForm.categoria_id ||
      !importForm.subcategoria_id
    ) {
      notify("Cole pelo menos um link e informe a classificação completa.", "error");
      return;
    }
    setBusy(true);
    setImportStatus("Validando os links e acessando os álbuns…");
    setImportErrors([]);
    const pending = new Set(urls);
    setImportProgress({ state: "running", percent: 0, phase: 0, elapsed: 0, total: urls.length, created: 0, duplicates: 0, failures: 0 });
    const progressTimer = window.setInterval(() => {
      setImportProgress((current) => {
        if (current.state !== "running") return current;
        const elapsed = current.elapsed + 1;
        return { ...current, elapsed };
      });
    }, 1000);
    try {
      const totals = { created: 0, duplicates: 0, failures: 0, total: 0 };
      // Um álbum por requisição impede que uma peça com muitas mídias derrube o lote inteiro na Vercel.
      const batches = urls.map((url) => [url]);
      for (let index = 0; index < batches.length; index += 1) {
        setImportStatus(`Importando álbum ${index + 1} de ${batches.length}…`);
        let response: Response | null = null;
        let responseText = "";
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            const { data: { session } } = await supabaseBrowser().auth.getSession();
            response = await fetch("/api/admin/import-yupoo", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
              body: JSON.stringify({ ...importForm, urls: batches[index] }),
            });
            responseText = await response.text();
            if (response.ok || response.status < 500 || attempt === 1) break;
          } catch {
            response = null;
            responseText = "";
            if (attempt === 1) break;
          }
          setImportStatus(`O álbum ${index + 1} demorou mais que o esperado. Tentando novamente…`);
          await new Promise((resolve) => window.setTimeout(resolve, 900));
        }
        if (!response) {
          setImportErrors((items) => [...items, { url: batches[index][0], message: "Conexão interrompida. Confira o produto antes de tentar novamente." }]);
          totals.failures += 1;
          totals.total += 1;
          setImportProgress((current) => ({ ...current, percent: Math.round(((index + 1) / batches.length) * 100), phase: 3, created: totals.created, duplicates: totals.duplicates, failures: totals.failures }));
          continue;
        }
        let batchResult: { created?: number; duplicates?: number; failures?: number; total?: number; error?: string; errors?: { url: string; message: string }[] } = {};
        try { batchResult = responseText ? JSON.parse(responseText) : {}; } catch { batchResult = {}; }
        if (!response.ok || !Number.isInteger(batchResult.created) || !Number.isInteger(batchResult.failures)) {
          setImportErrors((items) => [...items, { url: batches[index][0], message: batchResult.error || `Resposta inválida do servidor (HTTP ${response.status}).` }]);
          if (response.status === 401 || response.status === 403) throw new Error(batchResult.error || "Sua sessão expirou. Entre novamente no painel.");
          totals.failures += 1;
          totals.total += 1;
          setImportProgress((current) => ({ ...current, percent: Math.round(((index + 1) / batches.length) * 100), phase: 3, created: totals.created, duplicates: totals.duplicates, failures: totals.failures }));
          continue;
        }
        totals.created += batchResult.created || 0;
        totals.duplicates += batchResult.duplicates || 0;
        totals.failures += batchResult.failures || 0;
        totals.total += batchResult.total || batches[index].length;
        if (batchResult.failures) setImportErrors((items) => [...items, ...(batchResult.errors?.length ? batchResult.errors : [{ url: batches[index][0], message: "Não foi possível importar este álbum." }])]);
        else pending.delete(batches[index][0]);
        setImportProgress((current) => ({ ...current, percent: Math.round(((index + 1) / batches.length) * 100), phase: index + 1 === batches.length ? 4 : 3, created: totals.created, duplicates: totals.duplicates, failures: totals.failures }));
      }
      const result = totals;
      setImportStatus(
        `${result.created} novos · ${result.duplicates} existentes · ${result.failures} falhas`,
      );
      setImportProgress((current) => ({ ...current, state: "done", percent: 100, phase: 4, total: result.total, created: result.created, duplicates: result.duplicates, failures: result.failures }));
      await loadData();
      notify(result.failures ? "Importação terminou com pendências. Os links foram mantidos para nova tentativa." : "Importação concluída.", result.failures ? "error" : "success");
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : "Falha na importação.");
      setImportProgress((current) => ({ ...current, state: "error" }));
      notify(
        error instanceof Error ? error.message : "Falha na importação.",
        "error",
      );
    } finally {
      setImportForm((current) => ({ ...current, urls: [...pending].join("\n") }));
      setImportAlbums([]);
      window.clearInterval(progressTimer);
      setBusy(false);
    }
  }

  async function previewCollection() {
    const urls = importForm.urls.split(/\s+/).map((url) => url.trim()).filter(Boolean);
    if (!urls.length) return notify("Cole o link da collection primeiro.", "error");
    setCollectionLoading(true);
    setImportStatus("Lendo a collection e buscando os álbuns…");
    try {
      const { data: { session } } = await supabaseBrowser().auth.getSession();
      const response = await fetch("/api/admin/import-yupoo", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` }, body: JSON.stringify({ urls, preview: true }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível ler a collection.");
      setImportAlbums((result.albums || []).map((album: Omit<ImportAlbum, "selected">) => ({ ...album, selected: true })));
      setImportStatus(`${result.total} álbuns encontrados. Escolha quais deseja importar.`);
    } catch (error) {
      setImportAlbums([]);
      setImportStatus("");
      notify(error instanceof Error ? error.message : "Não foi possível ler a collection.", "error");
    } finally {
      setCollectionLoading(false);
    }
  }

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.replace("/login");
  }

  if (status === "loading")
    return (
      <AdminState
        icon={<LoaderCircle className="spin" />}
        title="Carregando painel"
        text="Validando sua sessão e buscando os dados da loja."
      />
    );
  if (status === "setup")
    return (
      <AdminState
        icon={<Settings />}
        title="Conecte o Supabase"
        text="Cadastre NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY na Vercel e execute o arquivo supabase/schema.sql no SQL Editor do seu projeto."
      />
    );
  if (status === "error")
    return (
      <AdminState
        icon={<RefreshCw />}
        title="Não foi possível carregar o painel"
        text="A conexão existe, mas o banco respondeu com erro. Confira se o schema mais recente foi executado e tente novamente."
        action={
          <button className="button primary" onClick={() => location.reload()}>
            TENTAR NOVAMENTE
          </button>
        }
      />
    );
  if (status === "denied")
    return (
      <AdminState
        icon={<EyeOff />}
        title="Acesso ainda não liberado"
        text="Sua conta existe, mas não possui o papel admin. Adicione seu usuário à tabela user_roles com o papel admin."
        action={
          <button className="button primary" onClick={signOut}>
            SAIR E USAR OUTRA CONTA
          </button>
        }
      />
    );

  return (
    <div className="admin-shell" aria-busy={busy}>
      <aside className="admin-side">
        <BrandLogo />
        <nav aria-label="Painel administrativo">
          {nav.map((name) => (
            <button
              className={tab === name ? "active" : ""}
              aria-current={tab === name ? "page" : undefined}
              key={name}
              onClick={() => setTab(name)}
            >
              {name}
            </button>
          ))}
        </nav>
        <div className="admin-side-actions">
          <Link href="/">← Ver loja</Link>
          <button onClick={signOut}>
            <LogOut /> Sair
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <header>
          <div>
            <p className="eyebrow">PAINEL NORD</p>
            <h1>{tab}</h1>
          </div>
          {tab === "Produtos" && (
            <button className="button primary" onClick={openNewProduct}>
              <Plus /> NOVO PRODUTO
            </button>
          )}
        </header>
        {notice && (
          <div
            className={`admin-feedback ${notice.tone}`}
            role={notice.tone === "error" ? "alert" : "status"}
          >
            <span>{notice.text}</span>
            <button
              aria-label="Fechar mensagem"
              onClick={() => setNotice(null)}
            >
              <X />
            </button>
          </div>
        )}
        {busy && (
          <div className="admin-loading" role="status">
            <LoaderCircle className="spin" /> Salvando alterações…
          </div>
        )}

        {tab === "Dashboard" && (
          <>
            <div className="stats">
              {dashboardStats.map(({ label, value, Icon }) => (
                <div key={label}>
                  <Icon />
                  <span>{label}</span>
                  <b>{value}</b>
                </div>
              ))}
            </div>
            <section className="admin-panel dashboard-summary">
              <h2>Visão geral</h2>
              <div>
                <span>
                  <CheckCircle2 />{" "}
                  {products.filter((product) => product.active).length} produtos
                  publicados
                </span>
                <span>
                  <EyeOff />{" "}
                  {products.filter((product) => !product.active).length}{" "}
                  produtos ocultos
                </span>
                <span>
                  <ImagePlus />{" "}
                  {
                    products.filter((product) => !product.product_images.length)
                      .length
                  }{" "}
                  produtos sem imagem
                </span>
              </div>
            </section>
          </>
        )}

        {tab === "Produtos" && (
          <section className="admin-panel">
            <div className="bulk">
              <label className="select-all">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() =>
                    setSelected(
                      allSelected ? [] : products.map((product) => product.id),
                    )
                  }
                />{" "}
                Selecionar todos
              </label>
              <span>{selected.length} selecionados</span>
              <button
                disabled={!selected.length}
                onClick={() => changeVisibility(true)}
              >
                <Eye /> Publicar
              </button>
              <button
                disabled={!selected.length}
                onClick={() => changeVisibility(false)}
              >
                <EyeOff /> Ocultar
              </button>
              <button
                disabled={!selected.length}
                onClick={() => {
                  setBulkTaxonomy({ brand_id: "", categoria_id: "", subcategoria_id: "" });
                  setBulkOpen(true);
                }}
              >
                <Layers /> Editar classificação
              </button>
              <button
                className="danger-action"
                disabled={!selected.length}
                onClick={() =>
                  setDeleteTarget({ kind: "products", ids: selected })
                }
              >
                <Trash2 /> Excluir
              </button>
            </div>
            {products.length ? (
              <div className="admin-list">
                {products.map((product) => (
                  <div className="admin-product-row" key={product.id}>
                    <input
                      aria-label={`Selecionar ${product.name}`}
                      type="checkbox"
                      checked={selected.includes(product.id)}
                      onChange={(event) =>
                        setSelected(
                          event.target.checked
                            ? [...selected, product.id]
                            : selected.filter((id) => id !== product.id),
                        )
                      }
                    />
                    <Image
                      src={product.product_images[0]?.url || "/hero-nord.png"}
                      alt=""
                      width={72}
                      height={72}
                      unoptimized={Boolean(
                        product.product_images[0]?.url?.startsWith("http"),
                      )}
                    />
                    <span>
                      <b>{product.name}</b>
                      <small>
                        {brandNameById(product.brand_id)} ·{" "}
                        {categoryName(product.categoria_id)} /{" "}
                        {subcategoryName(product.subcategoria_id)}
                      </small>
                    </span>
                    <em className={product.active ? "active" : "hidden"}>
                      {product.active ? "ATIVO" : "OCULTO"}
                    </em>
                    <button
                      aria-label={`Editar ${product.name}`}
                      onClick={() => openEditProduct(product)}
                    >
                      <Pencil />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="admin-empty">
                <Package />
                <h2>Nenhum produto cadastrado</h2>
                <button className="button primary" onClick={openNewProduct}>
                  CRIAR PRIMEIRO PRODUTO
                </button>
              </div>
            )}
          </section>
        )}

        {tab === "Importar Yupoo" && (
          <form className="admin-panel import-panel" onSubmit={runImport}>
            <Upload size={36} />
            <div>
              <h2>Importar produtos do Yupoo</h2>
              <p>
                Cole vários links de álbuns — um por linha. Todos serão importados
                para a mesma marca, categoria e subcategoria escolhidas abaixo.
              </p>
            </div>
            <label>
              Links dos produtos
              <textarea
                className="admin-input import-url-list"
                required
                rows={7}
                value={importForm.urls}
                onChange={(e) => {
                  setImportForm({ ...importForm, urls: e.target.value });
                  setImportAlbums([]);
                }}
                placeholder={"https://loja.x.yupoo.com/albums/123456\nhttps://loja.x.yupoo.com/albums/789012\nhttps://loja.x.yupoo.com/albums/345678"}
              />
              <small>{importForm.urls.split(/\s+/).filter(Boolean).length} link(s) informado(s) · collections completas são divididas automaticamente em lotes seguros</small>
            </label>
            {hasYupooListing && !importAlbums.length && <section className="collection-callout">
              <span><Layers /></span>
              <div><b>PÁGINA COM VÁRIOS ÁLBUNS DETECTADA</b><p>Carregue a lista para visualizar as capas, nomes e escolher exatamente quais produtos importar.</p></div>
              <button className="button collection-preview-button" type="button" onClick={previewCollection} disabled={collectionLoading || busy}>
                {collectionLoading ? <LoaderCircle className="spin" /> : <ImagePlus />} {collectionLoading ? "BUSCANDO TODOS OS ÁLBUNS…" : "CARREGAR E ESCOLHER ÁLBUNS"}
              </button>
            </section>}
            {!hasYupooListing && importLinks.length > 0 && !importAlbums.length && <p className="direct-album-note"><CheckCircle2 /> {importLinks.length} álbum(ns) individual(is) pronto(s). Para escolher produtos de uma categoria ou collection, cole o link da página completa do Yupoo.</p>}
            {importAlbums.length > 0 && <section className="collection-picker">
              <header><div><small>SELEÇÃO DA COLLECTION</small><h3>Escolha os álbuns</h3><p>{importAlbums.filter((album) => album.selected).length} de {importAlbums.length} selecionados</p></div><div><button type="button" onClick={() => setImportAlbums((items) => items.map((item) => ({ ...item, selected: true })))}>MARCAR TODOS</button><button type="button" onClick={() => setImportAlbums((items) => items.map((item) => ({ ...item, selected: false })))}>LIMPAR</button></div></header>
              <div className="collection-album-grid">
                {importAlbums.map((album, index) => <label key={album.url} className={album.selected ? "selected" : ""}>
                  <input type="checkbox" checked={album.selected} onChange={(event) => setImportAlbums((items) => items.map((item) => item.url === album.url ? { ...item, selected: event.target.checked } : item))} />
                  <span className="collection-album-image">{album.image ? <Image src={album.image} alt="" fill sizes="180px" unoptimized /> : <ImagePlus />}</span>
                  <span><small>{String(index + 1).padStart(2, "0")}</small><b>{album.title}</b></span>
                  <CheckCircle2 />
                </label>)}
              </div>
            </section>}
            <div className="form-row">
              <label>
                Marca
                <select
                  className="admin-input"
                  required
                  value={importForm.brand_id}
                  onChange={(e) =>
                    setImportForm({
                      ...importForm,
                      brand_id: e.target.value,
                      categoria_id: "",
                      subcategoria_id: "",
                    })
                  }
                >
                  <option value="">Selecione</option>
                  {brands.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Categoria
                <select
                  className="admin-input"
                  required
                  value={importForm.categoria_id}
                  onChange={(e) =>
                    setImportForm({
                      ...importForm,
                      categoria_id: e.target.value,
                      subcategoria_id: "",
                    })
                  }
                >
                  <option value="">Selecione</option>
                  {importCategories.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Subcategoria
                <select
                  className="admin-input"
                  required
                  value={importForm.subcategoria_id}
                  onChange={(e) =>
                    setImportForm({
                      ...importForm,
                      subcategoria_id: e.target.value,
                    })
                  }
                >
                  <option value="">Selecione</option>
                  {importSubcategories.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button className="button primary" disabled={busy || collectionLoading || (importAlbums.length > 0 && !importAlbums.some((album) => album.selected))}>
              <RefreshCw className={busy ? "spin" : ""} /> INICIAR IMPORTAÇÃO
            </button>
            <div className={`import-progress ${importProgress.state}`} aria-live="polite">
              {importErrors.length > 0 && <details open><summary>{importErrors.length} álbum(ns) com pendências — confira os motivos</summary><ul>{importErrors.map((item, index) => <li key={`${item.url}-${index}`}><a href={item.url} target="_blank" rel="noreferrer">Abrir álbum {index + 1}</a>: {item.message}</li>)}</ul><p>Os links pendentes permanecem no campo acima para tentar novamente.</p></details>}
              <header>
                <span className="import-progress-icon">
                  {importProgress.state === "done" ? <CheckCircle2 /> : importProgress.state === "error" ? <X /> : <RefreshCw className={importProgress.state === "running" ? "spin" : ""} />}
                </span>
                <div>
                  <small>{importProgress.state === "running" ? `IMPORTAÇÃO EM ANDAMENTO · ${importProgress.elapsed}s` : importProgress.state === "done" ? "IMPORTAÇÃO CONCLUÍDA" : importProgress.state === "error" ? "A IMPORTAÇÃO FOI INTERROMPIDA" : "CENTRAL DE IMPORTAÇÃO"}</small>
                  <strong>{importStatus || "Pronto para importar o lote"}</strong>
                </div>
                <b>{importProgress.percent}%</b>
              </header>
              <div className="import-progress-track" aria-label={`${importProgress.percent}% concluído`}><i style={{ width: `${importProgress.percent}%` }} /></div>
              <ol>
                {["Validar links", "Ler os álbuns", "Selecionar mídia", "Salvar na Nord"].map((label, index) => (
                  <li key={label} className={importProgress.phase > index ? "complete" : importProgress.phase === index && importProgress.state === "running" ? "current" : ""}>
                    <span>{importProgress.phase > index ? <CheckCircle2 /> : index + 1}</span><b>{label}</b>
                  </li>
                ))}
              </ol>
              {importProgress.state === "running" && <p>Não feche esta aba. Álbuns com muitas fotos e vídeos podem levar alguns minutos.</p>}
              {importProgress.state === "done" && <div className="import-summary"><span><b>{importProgress.created}</b><small>NOVOS</small></span><span><b>{importProgress.duplicates}</b><small>JÁ EXISTIAM</small></span><span><b>{importProgress.failures}</b><small>FALHAS</small></span><span><b>{importProgress.total}</b><small>TOTAL</small></span></div>}
            </div>
          </form>
        )}

        {tab === "Categorias" && (
          <section className="admin-panel taxonomy-panel">
            <div className="taxonomy-forms">
              <form onSubmit={createBrand}>
                <h2>Nova marca</h2>
                <label>
                  Nome
                  <input
                    className="admin-input"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Logo da marca
                  <input className="admin-input brand-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setBrandLogoFile(event.target.files?.[0] || null)} />
                  <small>PNG com fundo transparente funciona melhor.</small>
                </label>
                <button className="button primary">
                  <Plus /> ADICIONAR MARCA
                </button>
              </form>
              <form onSubmit={createCategory}>
                <h2>Nova categoria</h2>
                <label>
                  Marca
                  <select
                    className="admin-input"
                    value={categoryForm.brand_id}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        brand_id: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Selecione</option>
                    {brands.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Nome
                  <input
                    className="admin-input"
                    value={categoryForm.name}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, name: e.target.value })
                    }
                    required
                  />
                </label>
                <button className="button primary">
                  <Plus /> ADICIONAR CATEGORIA
                </button>
              </form>
              <form onSubmit={createSubcategory}>
                <h2>Nova subcategoria</h2>
                <label>
                  Categoria
                  <select
                    className="admin-input"
                    value={subcategoryForm.category_id}
                    onChange={(e) =>
                      setSubcategoryForm({
                        ...subcategoryForm,
                        category_id: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Selecione</option>
                    {categories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {brandNameById(item.brand_id)} · {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Nome
                  <input
                    className="admin-input"
                    value={subcategoryForm.name}
                    onChange={(e) =>
                      setSubcategoryForm({
                        ...subcategoryForm,
                        name: e.target.value,
                      })
                    }
                    required
                  />
                </label>
                <button className="button primary">
                  <Plus /> ADICIONAR SUBCATEGORIA
                </button>
              </form>
            </div>
            <div className="taxonomy-tree">
              <h2>Estrutura da loja</h2>
              {brands.map((brand) => (
                <details key={brand.id}>
                  <summary>
                    <span className="taxonomy-brand-name">{brand.logo_url ? <Image src={brand.logo_url} alt="" width={48} height={32} unoptimized /> : null}{brand.name}</span>
                    <small>
                      {
                        categories.filter((item) => item.brand_id === brand.id)
                          .length
                      }{" "}
                      categorias
                    </small>
                    <label className="brand-logo-upload" title={`Adicionar ou trocar logo de ${brand.name}`}>
                      <ImagePlus aria-hidden="true" />
                      <span className="sr-only">Adicionar ou trocar logo de {brand.name}</span>
                      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => replaceBrandLogo(brand.id, event.target.files?.[0])} />
                    </label>
                    <button
                      aria-label={`Excluir marca ${brand.name}`}
                      onClick={(event) => {
                        event.preventDefault();
                        setDeleteTarget({
                          kind: "brand",
                          id: brand.id,
                          label: brand.name,
                        });
                      }}
                    >
                      <Trash2 />
                    </button>
                  </summary>
                  {categories
                    .filter((item) => item.brand_id === brand.id)
                    .map((category) => (
                      <div className="taxonomy-category" key={category.id}>
                        <div>
                          <ChevronRight />
                          {taxonomyEdit?.kind === "category" && taxonomyEdit.id === category.id ? (
                            <form className="taxonomy-rename" onSubmit={renameTaxonomy}>
                              <input autoFocus className="admin-input" value={taxonomyEdit.name} onChange={(event) => setTaxonomyEdit({ ...taxonomyEdit, name: event.target.value })} aria-label="Novo nome da categoria" />
                              <button className="save" aria-label="Salvar novo nome"><CheckCircle2 /></button>
                              <button type="button" onClick={() => setTaxonomyEdit(null)} aria-label="Cancelar edição"><X /></button>
                            </form>
                          ) : <b>{category.name}</b>}
                          <span className="taxonomy-item-actions">
                          <button
                            aria-label={`Renomear categoria ${category.name}`}
                            title="Renomear categoria"
                            onClick={() => setTaxonomyEdit({ kind: "category", id: category.id, name: category.name })}
                          >
                            <Pencil />
                          </button>
                          <button
                            aria-label={`Excluir categoria ${category.name}`}
                            onClick={() =>
                              setDeleteTarget({
                                kind: "category",
                                id: category.id,
                                label: category.name,
                              })
                            }
                          >
                            <Trash2 />
                          </button>
                          </span>
                        </div>
                        {subcategories
                          .filter((item) => item.category_id === category.id)
                          .map((subcategory) => (
                            <div className="taxonomy-subcategory" key={subcategory.id}>
                              {taxonomyEdit?.kind === "subcategory" && taxonomyEdit.id === subcategory.id ? (
                                <form className="taxonomy-rename" onSubmit={renameTaxonomy}>
                                  <input autoFocus className="admin-input" value={taxonomyEdit.name} onChange={(event) => setTaxonomyEdit({ ...taxonomyEdit, name: event.target.value })} aria-label="Novo nome da subcategoria" />
                                  <button className="save" aria-label="Salvar novo nome"><CheckCircle2 /></button>
                                  <button type="button" onClick={() => setTaxonomyEdit(null)} aria-label="Cancelar edição"><X /></button>
                                </form>
                              ) : <span>{subcategory.name}</span>}
                              <span className="taxonomy-item-actions">
                              <button aria-label={`Renomear subcategoria ${subcategory.name}`} title="Renomear subcategoria" onClick={() => setTaxonomyEdit({ kind: "subcategory", id: subcategory.id, name: subcategory.name })}><Pencil /></button>
                              <button
                                aria-label={`Excluir subcategoria ${subcategory.name}`}
                                onClick={() =>
                                  setDeleteTarget({
                                    kind: "subcategory",
                                    id: subcategory.id,
                                    label: subcategory.name,
                                  })
                                }
                              >
                                <Trash2 />
                              </button>
                              </span>
                            </div>
                          ))}
                      </div>
                    ))}
                </details>
              ))}
            </div>
          </section>
        )}

        {tab === "Configurações" && (
          <form className="admin-panel settings-panel" onSubmit={saveSettings}>
            <Settings />
            <div>
              <h2>Contato</h2>
              <p>
                Esses dados passam a ser usados nos botões de conversão da loja.
              </p>
            </div>
            <label>
              Número do WhatsApp
              <input
                className="admin-input"
                inputMode="numeric"
                value={settings.whatsapp}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    whatsapp: e.target.value.replace(/\D/g, ""),
                  })
                }
                required
              />
              <small>País + DDD + número, somente dígitos.</small>
            </label>
            <label>
              Mensagem padrão
              <textarea
                className="admin-input"
                rows={4}
                value={settings.default_message}
                onChange={(e) =>
                  setSettings({ ...settings, default_message: e.target.value })
                }
                required
              />
            </label>
            <button className="button primary">SALVAR CONFIGURAÇÕES</button>
          </form>
        )}

      </main>

      <Dialog open={productOpen} onOpenChange={setProductOpen}>
        <DialogContent className="admin-dialog product-dialog">
          <DialogHeader className="product-editor-header">
            <div>
              <span className="editor-kicker">PAINEL NORD / PRODUTOS</span>
              <DialogTitle>{editingId ? "Editar produto" : "Novo produto"}</DialogTitle>
              <DialogDescription>Organize conteúdo, classificação, publicação e mídia da peça.</DialogDescription>
            </div>
            <span className={`editor-status ${draft.active ? "published" : "draft"}`}><i />{draft.active ? "PUBLICADO" : "RASCUNHO"}</span>
          </DialogHeader>
          <form
            id="product-form"
            onSubmit={saveProduct}
            className="product-form product-editor-form"
          >
            <div className="product-editor-layout">
            <div className="product-editor-main">
            <section className="editor-section">
              <div className="editor-section-heading"><span>01</span><div><h3>Identidade da peça</h3><p>Nome público, endereço e história do produto.</p></div></div>
            <div className="form-row">
              <label>
                Nome
                <input
                  className="admin-input"
                  value={draft.name}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      name: e.target.value,
                      slug: editingId ? draft.slug : slugify(e.target.value),
                    })
                  }
                  required
                />
              </label>
              <label>
                Slug
                <input
                  className="admin-input"
                  value={draft.slug}
                  onChange={(e) =>
                    setDraft({ ...draft, slug: slugify(e.target.value) })
                  }
                  required
                />
              </label>
            </div>
            <label>
              Descrição
              <textarea
                className="admin-input product-description-editor"
                rows={10}
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                placeholder={"Conte a história da peça em parágrafos.\n\n## Detalhes\n- Material e acabamento\n- Modelagem\n- Destaques da peça"}
              />
              <small className="field-help">Use linhas em branco para separar parágrafos, “##” para subtítulos e “-” para listas. A formatação aparecerá pronta na página do produto.</small>
            </label>
            <label>
              Link original do Yupoo
              <div className="admin-source-input">
                <input
                  className="admin-input"
                  type="url"
                  inputMode="url"
                  value={draft.yupoo_album_url}
                  onChange={(event) => setDraft({ ...draft, yupoo_album_url: event.target.value })}
                  placeholder="https://fornecedor.x.yupoo.com/albums/000000000"
                />
                {draft.yupoo_album_url && <a href={draft.yupoo_album_url} target="_blank" rel="noreferrer" aria-label="Abrir álbum original no Yupoo">ABRIR YUPOO <ExternalLink /></a>}
              </div>
              <small className="field-help">Origem principal deste produto. Este endereço aparece somente para administradores.</small>
            </label>
            </section>
            <section className="editor-section">
              <div className="editor-section-heading"><span>02</span><div><h3>Comercial</h3><p>Controle interno e forma de exibição do valor.</p></div></div>
            <div className="form-row">
              <label>
                SKU
                <input
                  className="admin-input"
                  value={draft.sku}
                  onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
                />
              </label>
              <label>
                Preço em reais
                <input
                  className="admin-input"
                  inputMode="decimal"
                  value={draft.price}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      price: e.target.value.replace(/[^0-9,.]/g, ""),
                    })
                  }
                  placeholder="Ex.: 1299,90"
                />
              </label>
            </div>
            <p className="price-toggle">Ao preencher o preço, ele aparece automaticamente no catálogo e na página do produto. Deixe vazio para exibir “Sob consulta”.</p>
            </section>
            <section className="editor-section">
              <div className="editor-section-heading"><span>03</span><div><h3>Classificação</h3><p>Defina onde esta peça será encontrada no catálogo.</p></div></div>
            <div className="form-row taxonomy-selects">
              <label>
                Marca
                <select
                  className="admin-input"
                  value={draft.brand_id}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      brand_id: e.target.value,
                      collaborator_brand_ids: draft.collaborator_brand_ids.filter((id) => id !== e.target.value),
                      categoria_id: "",
                      subcategoria_id: "",
                    })
                  }
                  required
                >
                  <option value="">Selecione</option>
                  {brands.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="collaboration-brands">
                <legend>Colaboração entre marcas <small>Opcional</small></legend>
                <p>Marque todas as outras marcas que assinam esta peça. Ela aparecerá na página e nos resultados de cada marca.</p>
                <div>
                  {brands.filter((item) => item.id !== draft.brand_id).map((item) => (
                    <label key={item.id}>
                      <input
                        type="checkbox"
                        checked={draft.collaborator_brand_ids.includes(item.id)}
                        onChange={(event) => setDraft({
                          ...draft,
                          collaborator_brand_ids: event.target.checked
                            ? [...draft.collaborator_brand_ids, item.id]
                            : draft.collaborator_brand_ids.filter((id) => id !== item.id),
                        })}
                      />
                      {item.name}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label>
                Categoria
                <select
                  className="admin-input"
                  value={draft.categoria_id}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      categoria_id: e.target.value,
                      subcategoria_id: "",
                    })
                  }
                  required
                  disabled={!draft.brand_id}
                >
                  <option value="">Selecione</option>
                  {productCategories.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Subcategoria
                <select
                  className="admin-input"
                  value={draft.subcategoria_id}
                  onChange={(e) =>
                    setDraft({ ...draft, subcategoria_id: e.target.value })
                  }
                  required
                  disabled={!draft.categoria_id}
                >
                  <option value="">Selecione</option>
                  {productSubcategories.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            </section>
            <section className="editor-section">
              <div className="editor-section-heading"><span>04</span><div><h3>Publicação</h3><p>Escolha onde a peça ganha destaque na vitrine.</p></div></div>
            <fieldset className="product-switches">
              <legend>Exibição</legend>
              <label>
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) =>
                    setDraft({ ...draft, active: e.target.checked })
                  }
                />{" "}
                Produto ativo
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={draft.sought}
                  onChange={(e) =>
                    setDraft({ ...draft, sought: e.target.checked })
                  }
                />{" "}
                Mais procurado
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={draft.rare}
                  onChange={(e) =>
                    setDraft({ ...draft, rare: e.target.checked })
                  }
                />{" "}
                Achado raro
              </label>
            </fieldset>
            </section>
            </div>
            <aside className="product-editor-media">
              <div className="editor-media-preview">
                <span>PRÉ-VISUALIZAÇÃO DA CAPA</span>
                <div className={coverMedia && isVideoUrl(coverMedia.url) ? "is-video" : ""}>
                  {coverMedia ? (
                    isVideoUrl(coverMedia.url) ? (
                      <video src={coverMedia.url} muted playsInline controls preload="metadata" />
                    ) : (
                      <Image src={coverMedia.url} alt={draft.name || "Capa do produto"} fill sizes="360px" unoptimized />
                    )
                  ) : (
                    <div className="editor-media-empty"><ImagePlus /><b>SEM CAPA</b><small>Adicione uma foto para visualizar a peça.</small></div>
                  )}
                </div>
                <strong>{draft.name || "Produto sem nome"}</strong>
                <small>{brands.find((brand) => brand.id === draft.brand_id)?.name || "Marca não definida"}</small>
              </div>
              <div className="editor-section-heading media-heading"><span>05</span><div><h3>Galeria</h3><p>Arraste, organize e escolha a imagem principal.</p></div></div>
            {editingId && editingProduct?.product_images.length ? (
              <div><div className="image-manager-heading"><span><b>FOTOS E VÍDEOS DO PRODUTO</b><small>Arraste para reordenar. Somente fotos podem ser capa.</small></span></div><div className="image-manager">
                {editingProduct.product_images.map((image, index) => (
                    <div key={image.id} className={`media-card ${image.is_cover ? "is-cover" : ""} ${draggedImageId === image.id ? "dragging" : ""}`} draggable onDragStart={() => setDraggedImageId(image.id)} onDragEnd={() => setDraggedImageId(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => void reorderImages(editingId, image.id)}>
                      <span className="media-order">{String(index + 1).padStart(2, "0")}</span>
                      <span className="image-drag-handle"><GripVertical /> ARRASTAR</span>
                      {isVideoUrl(image.url) ? <video src={image.url} muted playsInline preload="metadata" /> : <Image src={image.url} alt="" width={92} height={92} unoptimized />}
                      <div className="media-card-actions">
                      <button
                        type="button"
                        onClick={() => setCover(editingId, image.id)}
                        disabled={image.is_cover || isVideoUrl(image.url)}
                      >
                        {image.is_cover ? "Capa" : isVideoUrl(image.url) ? "Vídeo" : "Definir capa"}
                      </button>
                      <button
                        type="button"
                        className="danger-text"
                        onClick={() =>
                          deleteImage(
                            editingId,
                            image.id,
                            image.storage_path,
                            image.is_cover,
                          )
                        }
                      >
                        Remover
                      </button>
                      </div>
                    </div>
                  ))}
              </div></div>
            ) : null}
            <label className="file-drop">
              <ImagePlus />
              <span>Adicionar fotos ou vídeos</span>
              <small>Fotos JPG, PNG e WebP; vídeos MP4, WebM ou MOV. Fotos não quadradas são adaptadas automaticamente para 1:1, sem cortes.</small>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
            </label>
            {files.length > 0 && (
              <p className="file-count">
                {files.length}{" "}
                {files.length === 1
                  ? "arquivo selecionado"
                : "arquivos selecionados"}
              </p>
            )}
            </aside>
            </div>
          </form>
          <DialogFooter className="product-editor-footer">
            <button
              className="button"
              type="button"
              onClick={() => setProductOpen(false)}
            >
              CANCELAR
            </button>
            <button
              className="button primary"
              type="submit"
              form="product-form"
              disabled={busy}
            >
              {busy ? "SALVANDO..." : editingId ? "SALVAR ALTERAÇÕES" : "CRIAR PRODUTO"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="admin-dialog">
          <DialogHeader>
            <DialogTitle>Editar {selected.length} produtos em massa</DialogTitle>
            <DialogDescription>
              A nova marca, categoria e subcategoria serão aplicadas a todos os produtos selecionados.
            </DialogDescription>
          </DialogHeader>
          <form id="bulk-form" onSubmit={moveProducts} className="product-form">
            <label>
              Marca
              <select
                className="admin-input"
                value={bulkTaxonomy.brand_id}
                onChange={(e) =>
                  setBulkTaxonomy({
                    brand_id: e.target.value,
                    categoria_id: "",
                    subcategoria_id: "",
                  })
                }
                required
              >
                <option value="">Selecione</option>
                {brands.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Categoria
              <select
                className="admin-input"
                value={bulkTaxonomy.categoria_id}
                onChange={(e) =>
                  setBulkTaxonomy({
                    ...bulkTaxonomy,
                    categoria_id: e.target.value,
                    subcategoria_id: "",
                  })
                }
                disabled={!bulkTaxonomy.brand_id}
                required
              >
                <option value="">Selecione</option>
                {bulkCategories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Subcategoria
              <select
                className="admin-input"
                value={bulkTaxonomy.subcategoria_id}
                onChange={(e) =>
                  setBulkTaxonomy({
                    ...bulkTaxonomy,
                    subcategoria_id: e.target.value,
                  })
                }
                disabled={!bulkTaxonomy.categoria_id}
                required
              >
                <option value="">Selecione</option>
                {bulkSubcategories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </form>
          <DialogFooter>
            <button className="button" onClick={() => setBulkOpen(false)}>
              CANCELAR
            </button>
            <button className="button primary" type="submit" form="bulk-form">
              APLICAR A TODOS
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="admin-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === "products"
                ? `Você excluirá ${deleteTarget.ids.length} produto(s), incluindo suas imagens.`
                : `Você excluirá “${deleteTarget?.label}”. Estruturas que ainda possuem produtos vinculados não podem ser apagadas.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AdminState({
  icon,
  title,
  text,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <main className="admin-state">
      <BrandLogo />
      <div>
        {icon}
        <h1>{title}</h1>
        <p>{text}</p>
        {action}
      </div>
      <Link href="/">← Voltar para a loja</Link>
    </main>
  );
}
