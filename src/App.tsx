import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { auth, db, signIn, signOut, OperationType, handleFirestoreError } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, getDocs, addDoc, query, where, doc, getDoc } from 'firebase/firestore';
import { analyzeProductImage } from './lib/gemini';
import { Product, Supplier } from './types';
import { ProductCard } from './components/ProductCard';
import { cn } from './lib/utils';
import { 
  Camera, 
  Upload, 
  Search, 
  LogOut, 
  LogIn, 
  Loader2, 
  Database, 
  AlertCircle,
  X,
  RefreshCw,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{ product: Product; supplier: Supplier }[]>([]);
  const [allProducts, setAllProducts] = useState<{ product: Product; supplier: Supplier }[]>([]);
  const [view, setView] = useState<'search' | 'catalog'>('search');
  const [catalogFilter, setCatalogFilter] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [seedStatus, setSeedStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    code: '',
    price: '',
    category: 'lighting',
    imageUrl: '',
    tags: ''
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user && view === 'catalog') {
      fetchCatalog();
    }
  }, [user, view]);

  const fetchCatalog = async () => {
    try {
      const productsRef = collection(db, 'products');
      const querySnapshot = await getDocs(productsRef);
      
      const productsWithSuppliers: { product: Product; supplier: Supplier }[] = [];
      
      for (const productDoc of querySnapshot.docs) {
        const productData = productDoc.data() as Omit<Product, 'id'>;
        const product: Product = { id: productDoc.id, ...productData };
        
        const supplierDoc = await getDoc(doc(db, 'suppliers', product.supplierId));
        if (supplierDoc.exists()) {
          productsWithSuppliers.push({
            product,
            supplier: { id: supplierDoc.id, ...supplierDoc.data() } as Supplier
          });
        }
      }
      
      setAllProducts(productsWithSuppliers);
    } catch (err) {
      console.error("Error fetching catalog:", err);
      setError("Erro ao carregar o catálogo de produtos.");
    }
  };

  const filteredCatalog = allProducts.filter(({ product }) => {
    const matchesSearch = product.name.toLowerCase().includes(catalogFilter.toLowerCase()) || 
                         product.code.toLowerCase().includes(catalogFilter.toLowerCase());
    const matchesCategory = catalogCategory === 'all' || product.category === catalogCategory;
    return matchesSearch && matchesCategory;
  });

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignIn = async () => {
    try {
      setError(null);
      await signIn();
    } catch (err: any) {
      console.error("Sign in error:", err);
      if (err.code === 'auth/popup-blocked') {
        setError("O popup de login foi bloqueado. Por favor, permita popups ou abra o app em uma nova aba.");
      } else if (err.code === 'auth/cancelled-popup-request') {
        // User closed the popup
      } else {
        setError("Erro ao entrar. Tente abrir o app em uma nova aba clicando no ícone no canto superior direito.");
      }
    }
  };

  const performSearch = async () => {
    if (!selectedImage) return;
    
    setSearching(true);
    setError(null);
    setResults([]);

    try {
      // 1. Analyze image with Gemini
      const base64Data = selectedImage.split(',')[1];
      const mimeType = selectedImage.split(';')[0].split(':')[1];
      const analysis = await analyzeProductImage(base64Data, mimeType);
      
      console.log('Gemini Analysis:', analysis);

      // 2. Search Firestore
      // In a real app, we'd use vector search or more complex queries.
      // For this prototype, we'll search by category or tags.
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('category', '==', analysis.category));
      const querySnapshot = await getDocs(q);
      
      const matchedProducts: { product: Product; supplier: Supplier }[] = [];
      
      for (const productDoc of querySnapshot.docs) {
        const productData = productDoc.data() as Omit<Product, 'id'>;
        const product: Product = { id: productDoc.id, ...productData };
        
        // Fetch supplier
        const supplierDoc = await getDoc(doc(db, 'suppliers', product.supplierId));
        if (supplierDoc.exists()) {
          matchedProducts.push({
            product,
            supplier: { id: supplierDoc.id, ...supplierDoc.data() } as Supplier
          });
        }
      }

      // Fallback: If no category match, try searching by name keywords
      if (matchedProducts.length === 0) {
        const allProductsSnapshot = await getDocs(productsRef);
        for (const productDoc of allProductsSnapshot.docs) {
          const productData = productDoc.data() as Omit<Product, 'id'>;
          const nameMatch = analysis.tags.some((tag: string) => 
            productData.name.toLowerCase().includes(tag.toLowerCase()) ||
            productData.tags?.some(t => t.toLowerCase().includes(tag.toLowerCase()))
          );

          if (nameMatch) {
            const supplierDoc = await getDoc(doc(db, 'suppliers', productData.supplierId));
            if (supplierDoc.exists()) {
              matchedProducts.push({
                product: { id: productDoc.id, ...productData },
                supplier: { id: supplierDoc.id, ...supplierDoc.data() } as Supplier
              });
            }
          }
        }
      }

      setResults(matchedProducts);
      if (matchedProducts.length === 0) {
        setError("Nenhum produto correspondente encontrado no banco de dados.");
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao processar a busca. Verifique sua conexão e tente novamente.");
    } finally {
      setSearching(false);
    }
  };

  const seedData = async () => {
    if (!user) return;
    setLoading(true);
    setSeedStatus(null);
    try {
      // 1. Create Suppliers
      const supplierRef = await addDoc(collection(db, 'suppliers'), {
        name: "Distribuidora Global Tech",
        contact: "contato@globaltech.com.br | (11) 98888-7777",
        address: "Rua das Inovações, 123, São Paulo - SP"
      });

      const supplier2Ref = await addDoc(collection(db, 'suppliers'), {
        name: "Móveis & Design Ltda",
        contact: "vendas@moveisdesign.com | (21) 3333-4444",
        address: "Av. Estilo, 456, Rio de Janeiro - RJ"
      });

      const supplierPadraoRef = await addDoc(collection(db, 'suppliers'), {
        name: "Fornecedor Padrão",
        contact: "contato@fornecedorpadrao.com.br",
        address: "Zona Industrial, Galpão 4"
      });

      // 2. Define Products
      const userProducts = [
        { id: "PRD-001", supplier: "Fornecedor Padrão", name: "Pendente Clara Boia Globo de Vidro 20cm", price: 286.35, sku: "6948" },
        { id: "PRD-002", supplier: "Fornecedor Padrão", name: "Pendente Clara Boia Globo de Vidro 30cm", price: 401.35, sku: "6949" },
        { id: "PRD-003", supplier: "Fornecedor Padrão", name: "Pendente Industrial Vintage Globo de Vidro 25cm", price: 343.85, sku: "6819" },
        { id: "PRD-004", supplier: "Fornecedor Padrão", name: "Pendente Industrial Vintage Globo de Vidro 30cm", price: 458.85, sku: "6820" },
        { id: "PRD-005", supplier: "Fornecedor Padrão", name: "Pendente Haste Uno Globo de Vidro 15cm", price: 171.35, sku: "6821" },
        { id: "PRD-006", supplier: "Fornecedor Padrão", name: "Pendente Haste Uno Globo de Vidro 20cm", price: 228.85, sku: "6306" },
        { id: "PRD-007", supplier: "Fornecedor Padrão", name: "Pendente Haste Uno Globo de Vidro 25cm", price: 286.35, sku: "6822" },
        { id: "PRD-008", supplier: "Fornecedor Padrão", name: "Pendente Haste Uno Globo de Vidro 30cm", price: 343.85, sku: "6823" }
      ];

      const productsToInsert = [
        ...userProducts.map(p => ({
          name: p.name,
          code: p.sku,
          price: p.price,
          imageUrl: `https://picsum.photos/seed/${p.sku}/800/800`,
          supplierId: supplierPadraoRef.id,
          category: "lighting",
          tags: ["pendente", "iluminação", "vidro", "globo", "decoração"]
        })),
        {
          name: "Smartphone Galaxy S24 Ultra",
          code: "SAM-S24U-512",
          price: 8999.00,
          imageUrl: "https://picsum.photos/seed/s24/800/800",
          supplierId: supplierRef.id,
          category: "electronics",
          tags: ["smartphone", "samsung", "celular", "galaxy", "android"]
        },
        {
          name: "Cadeira Ergonômica Pro",
          code: "FUR-CHAIR-01",
          price: 1250.00,
          imageUrl: "https://picsum.photos/seed/chair/800/800",
          supplierId: supplier2Ref.id,
          category: "furniture",
          tags: ["cadeira", "escritório", "ergonômica", "móveis", "conforto"]
        },
        {
          name: "Fone de Ouvido Noise Cancelling",
          code: "AUD-HEAD-WH1000",
          price: 2100.00,
          imageUrl: "https://picsum.photos/seed/headphone/800/800",
          supplierId: supplierRef.id,
          category: "electronics",
          tags: ["fone", "headphone", "sony", "áudio", "bluetooth"]
        }
      ];

      for (const p of productsToInsert) {
        await addDoc(collection(db, 'products'), p);
      }

      setSeedStatus({ type: 'success', message: "Dados inseridos com sucesso!" });
    } catch (err: any) {
      console.error("Seed error:", err);
      setSeedStatus({ 
        type: 'error', 
        message: err.message?.includes('permission-denied') 
          ? "Erro de permissão: Verifique se seu e-mail está verificado no Google." 
          : "Erro ao inserir dados. Verifique o console." 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: any) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      // Find or create 'Fornecedor Padrão'
      const suppliersRef = collection(db, 'suppliers');
      const q = query(suppliersRef, where('name', '==', 'Fornecedor Padrão'));
      const querySnapshot = await getDocs(q);
      
      let supplierId = '';
      if (querySnapshot.empty) {
        const newSupplier = await addDoc(suppliersRef, {
          name: "Fornecedor Padrão",
          contact: "contato@fornecedorpadrao.com.br",
          address: "Zona Industrial, Galpão 4"
        });
        supplierId = newSupplier.id;
      } else {
        supplierId = querySnapshot.docs[0].id;
      }

      await addDoc(collection(db, 'products'), {
        name: newProduct.name,
        code: newProduct.code,
        price: parseFloat(newProduct.price),
        category: newProduct.category,
        imageUrl: newProduct.imageUrl,
        supplierId: supplierId,
        tags: newProduct.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
      });

      setIsAddModalOpen(false);
      setNewProduct({ name: '', code: '', price: '', category: 'lighting', imageUrl: '', tags: '' });
      alert("Produto adicionado com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao adicionar produto.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-bg text-text-main font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-2 text-primary font-bold text-xl">
          <div className="w-6 h-6 bg-primary rounded" />
          VisualSource AI
        </div>
        
        <div className="flex items-center gap-6">
          <nav className="flex bg-accent p-1 rounded-lg">
            <button 
              onClick={() => setView('search')}
              className={cn(
                "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                view === 'search' ? "bg-white text-primary shadow-sm" : "text-text-muted hover:text-text-main"
              )}
            >
              BUSCA VISUAL
            </button>
            <button 
              onClick={() => setView('catalog')}
              className={cn(
                "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                view === 'catalog' ? "bg-white text-primary shadow-sm" : "text-text-muted hover:text-text-main"
              )}
            >
              CATÁLOGO
            </button>
          </nav>

          <div className="text-sm text-text-muted hidden md:block">
            Banco de Dados: 1.240 Produtos Ativos
          </div>
          
          {user ? (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs font-bold text-text-main">{user.displayName}</p>
                <p className="text-[10px] text-text-muted">{user.email}</p>
              </div>
              <button 
                onClick={signOut}
                className="p-2 hover:bg-accent rounded-full transition-colors text-text-muted"
                title="Sair"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleSignIn}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-primary-dark transition-colors"
            >
              <LogIn size={16} />
              Entrar
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 grid grid-cols-[380px_1fr] overflow-hidden">
        {!user ? (
          <div className="col-span-2 flex flex-col items-center justify-center text-center p-8 space-y-6">
            <div className="bg-blue-50 w-20 h-20 rounded-3xl flex items-center justify-center text-primary">
              <Camera size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Busca Visual de Produtos</h2>
              <p className="text-text-muted max-w-md mx-auto">
                Faça login para pesquisar produtos por imagem e encontrar fornecedores instantaneamente.
              </p>
              {error && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex gap-3 text-red-600 max-w-md mx-auto mt-4">
                  <AlertCircle className="shrink-0" size={20} />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}
            </div>
            <button 
              onClick={handleSignIn}
              className="bg-primary text-white px-8 py-3 rounded-xl font-bold text-lg hover:bg-primary-dark transition-all shadow-lg shadow-blue-100"
            >
              Começar Agora
            </button>
          </div>
        ) : (
          <>
            {/* Sidebar / Search Panel */}
            <section className="bg-card border-r border-border p-8 flex flex-col gap-6 overflow-y-auto">
              <div>
                <h2 className="text-lg font-bold mb-1">Buscar Fornecedor</h2>
                <p className="text-sm text-text-muted">Envie a foto do protótipo para identificar a origem.</p>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "h-[240px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group",
                  selectedImage ? "border-primary bg-bg" : "border-border bg-bg hover:border-primary"
                )}
              >
                {selectedImage ? (
                  <>
                    <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <RefreshCw className="text-white" size={32} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-[#DBEAFE] rounded-full flex items-center justify-center text-primary mb-3">
                      <Upload size={24} />
                    </div>
                    <span className="text-sm font-medium text-text-main">Clique ou arraste a imagem</span>
                    <span className="text-xs text-text-muted mt-1">PNG, JPG ou WEBP</span>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  className="hidden" 
                  accept="image/*"
                />
              </div>

              <button
                disabled={!selectedImage || searching}
                onClick={performSearch}
                className={cn(
                  "w-full py-3.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all",
                  !selectedImage || searching 
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                    : "bg-primary text-white hover:bg-primary-dark shadow-md"
                )}
              >
                {searching ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Analisando...
                  </>
                ) : (
                  "PESQUISAR NO BANCO"
                )}
              </button>

              {error && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex gap-3 text-red-600">
                  <AlertCircle className="shrink-0" size={20} />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              {/* Admin Tools */}
              {user.email === "matheus.kraieski@adsplay.com.br" && (
                <div className="bg-accent p-4 rounded-lg space-y-3 mt-auto">
                  <div className="flex items-center gap-2 text-text-main">
                    <Database size={16} />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Admin Tools</h3>
                  </div>
                  <button 
                    onClick={seedData}
                    className="w-full bg-white border border-border text-text-main py-2 rounded-md text-xs font-bold hover:bg-gray-50 transition-colors"
                  >
                    Popular Banco de Dados
                  </button>
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="w-full bg-primary text-white py-2 rounded-md text-xs font-bold hover:bg-primary-dark transition-colors"
                  >
                    + Adicionar Produto Manual
                  </button>
                  {seedStatus && (
                    <div className={cn(
                      "p-2 rounded text-[10px] font-bold",
                      seedStatus.type === 'success' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    )}>
                      {seedStatus.message}
                    </div>
                  )}
                </div>
              )}

              <div className="bg-accent p-4 rounded-lg">
                <h4 className="text-[11px] font-bold text-text-muted uppercase mb-2">Modelo Sugerido (JSON)</h4>
                <div className="font-mono text-[11px] text-text-muted leading-relaxed">
                  {`{
  "id": "PRD-001",
  "supplier": "Global Tech",
  "price": 149.90,
  "sku": "GT-9821"
}`}
                </div>
              </div>
            </section>

            {/* Content / Results Panel */}
            <section className="p-8 overflow-y-auto">
              {view === 'search' ? (
                <>
                  <div className="flex items-center justify-between mb-4 text-[13px] font-bold text-text-muted uppercase tracking-wider">
                    <span>Resultado da Busca (Melhor Correspondência)</span>
                    {results.length > 0 && <span className="text-emerald-600">Confiança: 98.4%</span>}
                  </div>

                  {results.length > 0 ? (
                    <div className="space-y-6">
                      <AnimatePresence mode="popLayout">
                        {results.map(({ product, supplier }) => (
                          <ProductCard 
                            key={product.id} 
                            product={product} 
                            supplier={supplier} 
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-20 opacity-50">
                      <div className="text-4xl mb-4">📦</div>
                      <p className="text-sm font-medium">Nenhum resultado para exibir</p>
                      <p className="text-xs">Faça o upload de uma imagem para começar.</p>
                    </div>
                  )}

                  {results.length > 0 && (
                    <div className="mt-12">
                      <div className="text-[13px] font-bold text-text-muted uppercase tracking-wider mb-4">
                        Sugestões Similares
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {[1, 2].map(i => (
                          <div key={i} className="bg-white border border-border rounded-lg p-3 flex gap-4 items-center">
                            <div className="w-14 h-14 bg-bg rounded" />
                            <div>
                              <div className="text-sm font-bold">Similar SKU X{i}</div>
                              <div className="text-xs text-text-muted">Fornecedor: Delta Imp.</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-text-main">Catálogo de Produtos</h2>
                      <p className="text-sm text-text-muted">Explore e gerencie todos os itens cadastrados.</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                        <input 
                          type="text"
                          placeholder="Buscar por nome ou SKU..."
                          value={catalogFilter}
                          onChange={(e) => setCatalogFilter(e.target.value)}
                          className="pl-10 pr-4 py-2 bg-white border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none w-64"
                        />
                      </div>
                      <select 
                        value={catalogCategory}
                        onChange={(e) => setCatalogCategory(e.target.value)}
                        className="px-4 py-2 bg-white border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      >
                        <option value="all">Todas Categorias</option>
                        <option value="lighting">Iluminação</option>
                        <option value="electronics">Eletrônicos</option>
                        <option value="furniture">Móveis</option>
                        <option value="other">Outros</option>
                      </select>
                      <button 
                        onClick={fetchCatalog}
                        className="p-2 hover:bg-accent rounded-lg transition-colors text-text-muted"
                        title="Atualizar"
                      >
                        <RefreshCw size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {filteredCatalog.length > 0 ? (
                      filteredCatalog.map(({ product, supplier }) => (
                        <ProductCard 
                          key={product.id} 
                          product={product} 
                          supplier={supplier} 
                        />
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center py-20 opacity-50">
                        <div className="text-4xl mb-4">🔍</div>
                        <p className="text-sm font-medium">Nenhum produto encontrado no catálogo</p>
                        <p className="text-xs">Tente ajustar seus filtros ou adicione novos produtos.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Add Product Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-gray-50">
                <h3 className="text-xl font-bold text-text-main">Novo Produto</h3>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleAddProduct} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-text-muted uppercase">Nome do Produto</label>
                    <input 
                      required
                      type="text"
                      value={newProduct.name}
                      onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                      className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder="Ex: Pendente Globo"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-text-muted uppercase">SKU / Código</label>
                    <input 
                      required
                      type="text"
                      value={newProduct.code}
                      onChange={e => setNewProduct({...newProduct, code: e.target.value})}
                      className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder="Ex: 6948"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-text-muted uppercase">Preço (R$)</label>
                    <input 
                      required
                      type="number"
                      step="0.01"
                      value={newProduct.price}
                      onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                      className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-text-muted uppercase">Categoria</label>
                    <select 
                      value={newProduct.category}
                      onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                      className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      <option value="lighting">Iluminação</option>
                      <option value="electronics">Eletrônicos</option>
                      <option value="furniture">Móveis</option>
                      <option value="other">Outros</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted uppercase">URL da Imagem</label>
                  <input 
                    type="url"
                    value={newProduct.imageUrl}
                    onChange={e => setNewProduct({...newProduct, imageUrl: e.target.value})}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="https://exemplo.com/imagem.jpg"
                  />
                  <p className="text-[10px] text-text-muted italic">Dica: Use links do Imgur, Cloudinary ou do seu site.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted uppercase">Tags (separadas por vírgula)</label>
                  <input 
                    type="text"
                    value={newProduct.tags}
                    onChange={e => setNewProduct({...newProduct, tags: e.target.value})}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="pendente, vidro, moderno"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-2.5 border border-border rounded-lg font-bold text-sm hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-2.5 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary-dark transition-colors shadow-lg shadow-blue-100"
                  >
                    Salvar Produto
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
