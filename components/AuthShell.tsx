"use client"

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-fuchsia-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Partie gauche : branding */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 flex flex-col justify-center">
          <div className="flex flex-col items-center text-center">
            <img
              src="/images/logo-velopronostic.png"
              alt="Logo PronosVélo"
              className="h-36 w-36 object-contain mb-6"
            />

            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
              Bienvenue sur PronosVélo !
            </h1>

            <p className="text-white/75 text-lg leading-relaxed max-w-md">
              Crée ta team, rejoins une ligue et pronostique les bons coureurs
              pour remporter le classement.
            </p>
          </div>
        </div>

        {/* Partie droite : formulaire */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 flex flex-col justify-center">
          <h2 className="text-2xl font-bold mb-2">{title}</h2>
          <p className="text-white/70 mb-6">{subtitle}</p>

          {children}
        </div>
      </div>
    </div>
  )
}