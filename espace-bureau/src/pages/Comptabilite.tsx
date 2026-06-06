import { Link } from 'react-router-dom'
import {
  Wallet,
  HeartHandshake,
  Landmark,
  TrendingUp,
  AlertTriangle,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTable } from '@/lib/data/store'
import { computeProjectBudget, computeTreasury } from '@/lib/data/selectors'
import { formatEuro, formatEuroShort, currentSaison } from '@/lib/format'
import { PROJECT_STATUS_LABELS } from '@/types'
import { Card, StatCard, Badge, PageHeader } from '@/components/ui'

export function Comptabilite() {
  const cotisations = useTable('cotisations')
  const dons = useTable('dons')
  const members = useTable('members')
  const projects = useTable('projects')
  const budgetLines = useTable('budget_lines')

  const saison = currentSaison()
  const t = computeTreasury(cotisations, dons, budgetLines, projects)

  const aJour = new Set(
    cotisations.filter((c) => c.saison === saison && c.statut === 'paye').map((c) => c.member_id),
  )
  const enRetard = members.filter((m) => m.statut !== 'ancien' && !aJour.has(m.id)).length

  const chartData = projects.map((p) => {
    const b = computeProjectBudget(budgetLines.filter((l) => l.project_id === p.id))
    return {
      nom: p.nom.length > 18 ? p.nom.slice(0, 17) + '…' : p.nom,
      Recettes: b.recettesPrevu,
      Dépenses: b.depensesPrevu,
    }
  })

  return (
    <div>
      <PageHeader title="Comptabilité" subtitle={`Vue consolidée — saison ${saison}`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Trésorerie estimée"
          value={formatEuroShort(t.tresorerie)}
          hint="Cotisations encaissées + dons hors projet"
          icon={<Landmark size={26} />}
          tone="gold"
        />
        <StatCard
          label="Cotisations encaissées"
          value={formatEuroShort(t.cotisationsEncaissees)}
          hint={`${formatEuro(t.cotisationsEnAttente)} en attente`}
          icon={<Wallet size={26} />}
          tone="green"
        />
        <StatCard
          label="Dons reçus"
          value={formatEuroShort(t.donsTotal)}
          hint={`${dons.length} don(s) enregistré(s)`}
          icon={<HeartHandshake size={26} />}
          tone="neutral"
        />
        <StatCard
          label="Prévisionnel global"
          value={formatEuroShort(t.previsionnelGlobal)}
          hint={`Dont projets : ${formatEuro(t.soldeProjetsPrevu)}`}
          icon={<TrendingUp size={26} />}
          tone={t.previsionnelGlobal >= 0 ? 'green' : 'red'}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="section-title mb-4 text-xl">Budget prévisionnel par projet</h2>
          {chartData.length === 0 ? (
            <p className="text-sm text-prisme-base/50">Aucun projet pour le moment.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(232,229,223,0.08)" />
                <XAxis dataKey="nom" tick={{ fill: '#E8E5DF', fontSize: 11 }} />
                <YAxis tick={{ fill: '#E8E5DF', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: '#0F1A2C',
                    border: '1px solid rgba(184,151,84,0.4)',
                    borderRadius: 6,
                    color: '#E8E5DF',
                  }}
                  formatter={(v: number) => formatEuro(v)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Recettes" fill="#B89754" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Dépenses" fill="#4A658A" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h2 className="section-title mb-4 text-xl">Adhésions</h2>
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-prisme-base/70">
                <Users size={16} /> Membres actifs
              </span>
              <span className="font-serif text-2xl text-prisme-gold">
                {members.filter((m) => m.statut !== 'ancien').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-prisme-base/70">
                <AlertTriangle size={16} /> Cotisations à relancer
              </span>
              <span className="font-serif text-2xl text-amber-300">{enRetard}</span>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Link to="/cotisations" className="btn-outline w-full">
                Gérer les cotisations
              </Link>
              <Link to="/dons" className="btn-outline w-full">
                Gérer les dons
              </Link>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title text-xl">Synthèse par projet</h2>
          <Link to="/projets" className="text-sm text-prisme-gold hover:underline">
            Tout voir →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Projet</th>
                <th>Statut</th>
                <th className="text-right">Recettes prév.</th>
                <th className="text-right">Dépenses prév.</th>
                <th className="text-right">Solde prév.</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const b = computeProjectBudget(budgetLines.filter((l) => l.project_id === p.id))
                return (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/projets/${p.id}`} className="text-prisme-base hover:text-prisme-gold">
                        {p.nom}
                      </Link>
                    </td>
                    <td>
                      <Badge tone={p.statut === 'en_cours' ? 'green' : p.statut === 'cloture' ? 'neutral' : 'amber'}>
                        {PROJECT_STATUS_LABELS[p.statut]}
                      </Badge>
                    </td>
                    <td className="text-right">{formatEuro(b.recettesPrevu)}</td>
                    <td className="text-right">{formatEuro(b.depensesPrevu)}</td>
                    <td className={`text-right font-medium ${b.soldePrevu >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                      {formatEuro(b.soldePrevu)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
