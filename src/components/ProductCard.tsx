import { Product, Supplier } from '../types';
import { cn } from '../lib/utils';
import { Package, User, Tag, DollarSign } from 'lucide-react';
import { motion } from 'motion/react';

interface ProductCardProps {
  product: Product;
  supplier?: Supplier;
  className?: string;
  key?: string | number;
}

export function ProductCard({ product, supplier, className }: ProductCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-card rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow grid grid-cols-[180px_1fr]",
        className
      )}
    >
      <div className="bg-gray-200 flex items-center justify-center relative overflow-hidden h-full min-h-[180px]">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="text-text-muted flex flex-col items-center gap-2">
            <Package size={32} />
            <span className="text-[10px] uppercase font-bold">Sem Imagem</span>
          </div>
        )}
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-mono font-bold text-text-muted border border-border">
          {product.code}
        </div>
      </div>

      <div className="p-6 grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Produto</span>
          <span className="font-bold text-text-main line-clamp-1">{product.name}</span>
        </div>

        <div className="flex flex-col">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Código (SKU)</span>
          <span className="font-bold text-text-main">{product.code}</span>
        </div>

        <div className="flex flex-col">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Fornecedor</span>
          <span className="font-bold text-text-main line-clamp-1">{supplier?.name || 'N/A'}</span>
        </div>

        <div className="flex flex-col">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Preço Unitário</span>
          <div className="bg-[#DCFCE7] text-[#166534] px-2 py-1 rounded-md text-lg font-bold w-fit">
            R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="col-span-2 flex flex-col pt-2">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Contato</span>
          <span className="text-sm text-text-main truncate">{supplier?.contact || 'N/A'}</span>
        </div>

        <a 
          href="#" 
          className="col-span-2 border border-primary text-primary py-2 rounded-md text-center font-bold text-sm hover:bg-primary hover:text-white transition-colors mt-2"
          onClick={(e) => e.preventDefault()}
        >
          Falar com Vendedor
        </a>
      </div>
    </motion.div>
  );
}
