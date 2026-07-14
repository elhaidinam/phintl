import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Pill, ExternalLink } from 'lucide-react';
import LeaveScheduler from './components/LeaveScheduler';
import { JournalArticle } from './types';
import { subscribeToDoc, saveToDoc } from './lib/firebase';

interface TileProps {
  href: string;
  title: string;
  description: string;
  avatar: string;
  type: 'red' | 'green' | 'gold' | 'blue';
  key?: string | number;
}


const colorMap = {
  red: {
    border: 'border-l-[#dc2626]',
    text: 'text-[#dc2626]',
    bg: 'hover:bg-red-50'
  },
  green: {
    border: 'border-l-[#539F06]',
    text: 'text-[#539F06]',
    bg: 'hover:bg-green-50'
  },
  gold: {
    border: 'border-l-[#d4af37]',
    text: 'text-[#d4af37]',
    bg: 'hover:bg-yellow-50'
  },
  blue: {
    border: 'border-l-[#2563eb]',
    text: 'text-[#2563eb]',
    bg: 'hover:bg-blue-50'
  }
};

const Tile = ({ href, title, description, avatar, type }: TileProps) => {
  const colors = colorMap[type];
  
  return (
    <motion.a
      href={href || undefined}
      target={href ? "_blank" : undefined}
      rel={href ? "noopener noreferrer" : undefined}
      whileHover={{ x: 6, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`flex flex-row items-center text-left p-5 gap-5 bg-white rounded-2xl shadow-md border-l-8 transition-all duration-300 ${colors.border} ${colors.bg}`}
    >
      <div className="w-20 h-20 flex items-center justify-center overflow-hidden shrink-0 bg-gray-50 rounded-xl p-1">
        <img 
          src={avatar} 
          alt={title} 
          className="w-full h-full object-contain rounded-lg"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${title}&background=random`;
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className={`text-base font-extrabold mb-1 uppercase tracking-tight ${colors.text}`}>
          {title}
        </h2>
        <p className="text-xs text-gray-600 italic leading-relaxed line-clamp-3">
          "{description}"
        </p>
        {href && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400 font-semibold uppercase">
            En savoir plus <ExternalLink size={10} />
          </div>
        )}
      </div>
    </motion.a>
  );
};

export default function App() {
  const [currentSpace, setCurrentSpace] = useState<'public' | 'private' | 'planning'>('public');

  const [featuredText, setFeaturedText] = useState<string>(() => {
    return localStorage.getItem('pharmintl_featured_text') || "J'informe ceux qui ne m'ont pas encore fait de cadeau à l'occasion de mon anniversaire que je suis encore à l'affiche pour quelques jours. Tous vos dons en nature et en espèce sont bienvenus.";
  });

  const [featuredImage, setFeaturedImage] = useState<string>(() => {
    return localStorage.getItem('pharmintl_featured_image') || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix";
  });

  const [journalArticles, setJournalArticles] = useState<JournalArticle[]>(() => {
    const stored = localStorage.getItem('pharmintl_journal');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // Fallback to defaults
      }
    }
    return [
      {
        id: 'journal-default-1',
        title: 'Note de Direction - Lancement du Nouveau Portail',
        content: 'Bienvenue sur le Portail de Redevabilité de la Pharmacie Internationale. Ce portail centralise l\'ensemble de nos règlements, organigrammes, outils de pointage et déclarations financières. Utilisez votre espace privé sécurisé pour soumettre vos demandes de congés et mettre à jour votre biographie.',
        date: new Date().toISOString().split('T')[0],
        author: 'Direction (Owner)'
      }
    ];
  });

  useEffect(() => {
    // Dual-sync: Fetch initial state from local Express server database
    const syncFromExpress = () => {
      fetch('/api/sync')
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch from Express server');
          return res.json();
        })
        .then((data) => {
          if (data) {
            if (Array.isArray(data.journalArticles)) {
              setJournalArticles(data.journalArticles);
              localStorage.setItem('pharmintl_journal', JSON.stringify(data.journalArticles));
            }
            if (typeof data.featuredText === 'string' && data.featuredText) {
              setFeaturedText(data.featuredText);
              localStorage.setItem('pharmintl_featured_text', data.featuredText);
            }
            if (typeof data.featuredImage === 'string' && data.featuredImage) {
              setFeaturedImage(data.featuredImage);
              localStorage.setItem('pharmintl_featured_image', data.featuredImage);
            }
          }
        })
        .catch((err) => {
          console.warn("Could not sync from local server database in App.tsx:", err);
        });
    };

    // Run initial sync immediately
    syncFromExpress();

    // Set up periodic 10-second sync fallback
    const syncInterval = setInterval(syncFromExpress, 10000);

    // Listen to journalArticles in Firestore
    const unsubJournal = subscribeToDoc<JournalArticle[]>(
      'journal',
      'journalArticles',
      (data) => {
        setJournalArticles(data);
        localStorage.setItem('pharmintl_journal', JSON.stringify(data));
      },
      () => {
        const local = localStorage.getItem('pharmintl_journal');
        if (local) {
          try {
            return JSON.parse(local);
          } catch (e) {
            console.error(e);
          }
        }
        return [
          {
            id: 'journal-default-1',
            title: 'Note de Direction - Lancement du Nouveau Portail',
            content: 'Bienvenue sur le Portail de Redevabilité de la Pharmacie Internationale. Ce portail centralise l\'ensemble de nos règlements, organigrammes, outils de pointage et déclarations financières. Utilisez votre espace privé sécurisé pour soumettre vos demandes de congés et mettre à jour votre biographie.',
            date: new Date().toISOString().split('T')[0],
            author: 'Direction (Owner)'
          }
        ];
      }
    );

    // Listen to featured employee panel in Firestore
    const unsubFeaturedText = subscribeToDoc<string>(
      'featured_text',
      'featuredText',
      (data) => {
        setFeaturedText(data);
        localStorage.setItem('pharmintl_featured_text', data);
      },
      () => localStorage.getItem('pharmintl_featured_text') || 'Awa Diop est récompensée ce mois-ci pour sa ponctualité exemplaire et sa rigueur légendaire lors de la passation des caisses ! Félicitations !'
    );

    const unsubFeaturedImage = subscribeToDoc<string>(
      'featured_image',
      'featuredImage',
      (data) => {
        setFeaturedImage(data);
        localStorage.setItem('pharmintl_featured_image', data);
      },
      () => localStorage.getItem('pharmintl_featured_image') || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Awa'
    );

    return () => {
      unsubJournal();
      unsubFeaturedText();
      unsubFeaturedImage();
      clearInterval(syncInterval);
    };
  }, []);

  const handleUpdateFeaturedText = (text: string) => {
    setFeaturedText(text);
    localStorage.setItem('pharmintl_featured_text', text);
    saveToDoc('featured_text', 'featuredText', text);
  };

  const handleUpdateFeaturedImage = (image: string) => {
    setFeaturedImage(image);
    localStorage.setItem('pharmintl_featured_image', image);
    saveToDoc('featured_image', 'featuredImage', image);
  };

  const handleUpdateJournal = (updated: JournalArticle[]) => {
    setJournalArticles(updated);
    localStorage.setItem('pharmintl_journal', JSON.stringify(updated));
    saveToDoc('journal', 'journalArticles', updated);
  };

  const tiles: TileProps[] = [
    {
      type: 'red',
      title: "Employé à l'affiche",
      avatar: featuredImage,
      href: "",
      description: featuredText
    },
    {
      type: 'red',
      title: "Règlement Intérieur",
      avatar: "https://lh6.googleusercontent.com/proxy/19sIt7MqbjZ2A0eYSEGodRwnKySoVaOWSCWBccbU-lgQyYpAdkpRnMoc5bpUfewDEasnXFDm-pL5kRWNlLRuVRn6jgyhGepYINTRu4-Ja-w8kuEB_6gUtwxM6vkPIIVBbu7mzSd7cQ",
      href: "https://www.dropbox.com/scl/fi/iev2ws0yaxepr2y3xxhni/R-glement-Int-rieur.pdf?rlkey=c64cszhmcet4u6zao185pfhwj&dl=0",
      description: "Il est plus simple de connaître le règlement et s'y conformer que d'en subir le jugement!"
    },
    {
      type: 'green',
      title: "Organigramme",
      avatar: "https://www.slideegg.com/image/catalog/slideegg-75029-best-organization-chart-template.png",
      href: "https://www.dropbox.com/scl/fi/77zrryu8c58ke32wql2c1/PHINTLORG.ppsx?rlkey=lav6ekqz3mstfxwdopyo1pv4f&dl=0",
      description: "Consulter l'organisation fonctionnelle pour savoir se positionner et être au contrôle de ses tâches. Consulter les procédures pour être précis dans la réalisation des tâches."
    },
    {
      type: 'green',
      title: "Pointage",
      avatar: "https://www.accu-time.com/wp-content/uploads/2024/10/ezgif.com-animated-gif-maker.gif",
      href: "https://enketo.ona.io/x/ZEOcz9Vv",
      description: "Toute personne travaillant à la pharmacie doit pointer à l'arrivée et au départ. Par ailleurs, le rapport d'activités est obligatoire à la fin de chaque journée de travail."
    },
    {
      type: 'gold',
      title: "Redditions",
      avatar: "https://png.pngtree.com/png-clipart/20240814/original/pngtree-gold-coins-rain-png-image_15769382.png",
      href: "https://docs.google.com/forms/d/e/1FAIpQLSew-cj-PrJXh_yhNj1jZf_4jEBI-4Y1p5M5t_tOOzZ_NO-NDA/viewform?usp=sharing&ouid=103023564871234901533",
      description: "Au PFQ d'enregistrer toutes les redditions (sans le fond de caisse) conformément à ce qui est affiché dans Pharmasoft."
    },
    {
      type: 'gold',
      title: "Versements",
      avatar: "https://i.pinimg.com/originals/a7/b6/7d/a7b67d486eccb0f7c6e4503b92c70fc6.gif",
      href: "https://docs.google.com/forms/d/e/1FAIpQLSfaBsU7BAsd9VbNXyoB3xG4P316dTYj8Vmd2hYlq-T08-b8UQ/viewform?usp=sharing&ouid=103023564871234901533",
      description: "Au PFQ d'enregistrer tous les versements en banque effectués par les caissiers, conformément à ce qui est affiché sur les bordereaux de versement."
    },
    {
      type: 'blue',
      title: "Factures",
      avatar: "https://media.tenor.com/5KzghxNeCFYAAAAM/past-due-final-notice.gif",
      href: "https://docs.google.com/forms/d/e/1FAIpQLSfL7oTByk4XuMxDkdJKo5mqyHC51bw3QBsyWTpGk-Cd2VM8VQ/viewform?usp=sharing&ouid=103023564871234901533",
      description: "Au PFQ d'enregistrer toutes les factures devant être payées par la pharmacie dès leur arrivée."
    },
    {
      type: 'blue',
      title: "Règlements",
      avatar: "https://www.citizensbank.com/assets/CB_resources/images/content_2_0/Date.gif",
      href: "https://docs.google.com/forms/d/e/1FAIpQLSe6b-3Oy9AjPJmhq8P2o8J6oks45sMRHbCUUe5YPhm9hiyVHQ/viewform?usp=sharing&ouid=103023564871234901533",
      description: "Au PFQ d'enregistrer tous les règlements effectués par la pharmacie dès leur émission."
    }
  ];

  return (
    <div className="min-h-screen bg-[#EDFCE8] selection:bg-green-200">
      <header className="sticky top-0 z-50 bg-[#EDFFC4] shadow-md px-6 md:px-12 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-white shadow-lg border border-green-100 overflow-hidden p-1.5 shrink-0">
            <img 
              src="phintl.png" 
              alt="Pharmacie Internationale Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.className = "w-12 h-12 bg-[#22c55e] rounded-xl flex items-center justify-center text-white shadow-lg";
                  const fallbackIcon = document.createElement('span');
                  fallbackIcon.innerText = "💊";
                  fallbackIcon.className = "text-2xl";
                  parent.appendChild(fallbackIcon);
                }
              }}
            />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#22c55e] uppercase tracking-tighter">
            Pharmacie Internationale
          </h1>
        </div>
        <div className="text-right">
          <h2 className="text-lg md:text-xl font-bold text-[#E17522] leading-tight">
            Portail de Redevabilité
          </h2>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-16">
        <div id="top-nav-bar-portal" className="w-full" />

        {currentSpace === 'public' && (
          <div className="space-y-16">
            {/* Quick access tiles block */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <h3 className="text-xl font-extrabold text-[#539F06] uppercase tracking-wider flex items-center gap-2">
                <span>🚀</span> Liens d'Accès Rapide & Portails
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {tiles.map((tile, index) => (
                  <Tile 
                    key={index} 
                    href={tile.href}
                    title={tile.title}
                    description={tile.description}
                    avatar={tile.avatar}
                    type={tile.type}
                  />
                ))}
              </div>
            </motion.div>

            {/* Public Journal Officiel Section */}
            <motion.div
              id="journal-officiel-section"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6"
            >
              <div className="border-b pb-4">
                <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                  📰 Directives et Publication Légale
                </span>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight mt-1.5">
                  Journal Officiel de la Pharmacie Internationale
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Retrouvez ici l'ensemble des communiqués de service officiels de la Direction Générale.
                </p>
              </div>

              {journalArticles.length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-400 italic bg-gray-50 rounded-2xl border border-dashed">
                  Aucun communiqué officiel n'est publié actuellement au Journal Officiel.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {journalArticles.map((art) => (
                    <div key={art.id} className="p-6 rounded-2xl border border-gray-100 bg-gray-50/40 hover:bg-gray-50/80 hover:border-gray-200 transition-all space-y-3">
                      <div className="flex items-center justify-between gap-4 text-[10px] text-gray-400 font-mono font-bold">
                        <span>📅 {art.date}</span>
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full uppercase">
                          👤 {art.author}
                        </span>
                      </div>
                      <h4 className="text-base font-black text-gray-900 leading-snug">
                        {art.title}
                      </h4>
                      <p className="text-xs text-gray-600 font-medium whitespace-pre-wrap leading-relaxed">
                        {art.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Dynamic Leave & Work Schedule Management Module */}
        <LeaveScheduler 
          currentSpace={currentSpace} 
          onSpaceChange={setCurrentSpace} 
          journalArticles={journalArticles}
          onUpdateJournal={handleUpdateJournal}
          setJournalArticles={setJournalArticles}
          featuredText={featuredText}
          onUpdateFeaturedText={handleUpdateFeaturedText}
          setFeaturedText={setFeaturedText}
          featuredImage={featuredImage}
          onUpdateFeaturedImage={handleUpdateFeaturedImage}
          setFeaturedImage={setFeaturedImage}
        />
      </main>

      <footer className="py-8 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} Pharmacie Internationale - Système de Gestion Intégré</p>
      </footer>
    </div>
  );
}
