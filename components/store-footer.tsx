import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { brands, settings } from "@/lib/data";

export function StoreFooter() {
  return <footer className="footer">
    <Image className="footer-mountain" src="/morro-nord.png" alt="" width={593} height={180} aria-hidden="true" />
    <div className="footer-statement"><p>VISTA O QUE<br />TE <i>MOVE.</i></p><a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noreferrer">FALAR COM A NORD <ArrowUpRight /></a></div>
    <div className="footer-top">
      <div><BrandLogo className="footer-logo" /><p>Importados selecionados.<br />Do norte para qualquer lugar.</p></div>
      <div><h4>Navegue</h4><Link href="/produtos">Todos os produtos</Link><Link href="/marcas">Marcas</Link><Link href="/#sobre">Manifesto</Link></div>
      <div><h4>Em destaque</h4>{brands.slice(0, 5).map((b) => <Link href={`/marca/${b.toLowerCase().replaceAll(" ", "-")}`} key={b}>{b}</Link>)}</div>
      <div><h4>Conecte-se</h4><a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp <ArrowUpRight size={15} /></a><span>Instagram · em breve</span></div>
    </div>
    <div className="footer-bottom"><span>© 2026 NORD IMPORTS</span><span>ORIGINAIS · IMPORTADOS · SELECIONADOS</span><a href="#top">VOLTAR AO TOPO ↑</a></div>
  </footer>;
}
