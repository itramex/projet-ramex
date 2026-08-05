import { useState, useEffect } from 'react';
import { cooperativeService } from '../../services/api';
import { CanUpdate } from '../common/PermissionWrapper';
import Icon from '../common/Icon';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';
import {
 Chart as ChartJS,
 CategoryScale,
 LinearScale,
 BarElement,
 Title,
 Tooltip,
 Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function CooperativeDetails({ cooperativeId, onClose, onEdit }) {
 const [cooperative, setCooperative] = useState(null);
 const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState('general');
 const [adhData, setAdhData] = useState(null);
 const [adhLoading, setAdhLoading] = useState(false);
 const [adhFilters, setAdhFilters] = useState({ granularite: 'annee', actif: true, start: '', end: '' });

 useEffect(() => {
 loadCooperative();
 }, [cooperativeId]);

 const loadCooperative = async () => {
 setLoading(true);
 try {
 const response = await cooperativeService.getById(cooperativeId);
 setCooperative(response.data);
 } catch (error) {
 console.error('Erreur chargement coopérative:', error);
 alert('Erreur lors du chargement des détails');
 } finally {
 setLoading(false);
 }
 };

 const loadAdhesions = async () => {
 setAdhLoading(true);
 try {
 const params = {};
 if (adhFilters.granularite) params.granularite = adhFilters.granularite;
 if (adhFilters.start) params.start = adhFilters.start;
 if (adhFilters.end) params.end = adhFilters.end;
 if (adhFilters.actif !== undefined && adhFilters.actif !== null) params.actif = String(adhFilters.actif);
 const resp = await cooperativeService.adhesions(cooperativeId, params);
 setAdhData(resp.data);
 } catch (e) {
 console.error('Erreur chargement adhésions:', e);
 alert('Erreur lors du chargement de l\'historique d\'adhésion');
 } finally {
 setAdhLoading(false);
 }
 };

 useEffect(() => {
 if (activeTab === 'adhesions') {
 loadAdhesions();
 }
 }, [activeTab, cooperativeId]);

 if (loading) {
 return (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
 <div className="bg-white rounded-lg p-8">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
 <p className="mt-4 text-gray-600">Chargement...</p>
 </div>
 </div>
 );
 }

 if (!cooperative) return null;

 const InfoRow = ({ label, value }) => (
 <div className="grid grid-cols-3 gap-4 py-2 border-b border-gray-100">
 <span className="text-gray-600 font-medium">{label}:</span>
 <span className="col-span-2 text-dark">{value || '-'}</span>
 </div>
 );

 const InfoCard = ({ title, children, icon }) => (
 <Card title={title} icon={icon} padding="md">
 {children}
 </Card>
 );

 return (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
 {/* Header */}
 <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-lg flex-shrink-0">
 <div className="flex justify-between items-start">
 <div>
 <h2 className="text-3xl font-bold">{cooperative.nom}</h2>
 <p className="text-green-100 mt-1">
 {cooperative.sigle && `(${cooperative.sigle}) - `}
 Code: {cooperative.code}
 </p>
 <div className="flex gap-2 mt-3">
 <Badge variant={cooperative.active ? 'success' : 'error'} size="md">
 {cooperative.active ? 'Active' : 'Inactive'}
 </Badge>
 <Badge variant="neutral" size="md" icon="UsersIcon">
 {cooperative.nombre_producteurs || 0} producteurs
 </Badge>
 </div>
 </div>
 <div className="flex gap-2">
 <CanUpdate>
 <Button
 onClick={() => onEdit(cooperative)}
 variant="secondary"
 size="md"
 icon="PencilIcon"
 iconPosition="left"
 className="bg-white text-green-700 hover:bg-green-50"
 >
 Modifier
 </Button>
 </CanUpdate>
 <button
 onClick={onClose}
 className="bg-white bg-opacity-20 text-white px-4 py-2 rounded hover:bg-opacity-30"
 aria-label="Fermer"
 >
 <Icon name="XMarkIcon" size="lg" />
 </button>
 </div>
 </div>
 </div>

 {/* Tabs */}
 <div className="border-b flex-shrink-0">
 <div className="flex gap-4 px-6">
 <button
 onClick={() => setActiveTab('general')}
 className={`py-4 px-2 border-b-2 font-medium transition-colors flex items-center gap-2 ${
 activeTab === 'general'
 ? 'border-green-600 text-green-600'
 : 'border-transparent text-gray-500 hover:text-gray-700'
 }`}>
 <Icon name="DocumentTextIcon" size="sm" />
 Général
 </button>
 <button
 onClick={() => setActiveTab('responsables')}
 className={`py-4 px-2 border-b-2 font-medium transition-colors flex items-center gap-2 ${
 activeTab === 'responsables'
 ? 'border-green-600 text-green-600'
 : 'border-transparent text-gray-500 hover:text-gray-700'
 }`}>
 <Icon name="BriefcaseIcon" size="sm" />
 Responsables ({cooperative.responsables?.length || 0})
 </button>
 <button
 onClick={() => setActiveTab('membres')}
 className={`py-4 px-2 border-b-2 font-medium transition-colors flex items-center gap-2 ${
 activeTab === 'membres'
 ? 'border-green-600 text-green-600'
 : 'border-transparent text-gray-500 hover:text-gray-700'
 }`}>
 <Icon name="UsersIcon" size="sm" />
 Membres ({cooperative.nombre_producteurs || 0})
 </button>
 <button
 onClick={() => setActiveTab('adhesions')}
 className={`py-4 px-2 border-b-2 font-medium transition-colors flex items-center gap-2 ${
 activeTab === 'adhesions'
 ? 'border-green-600 text-green-600'
 : 'border-transparent text-gray-500 hover:text-gray-700'
 }`}>
 <Icon name="ChartBarIcon" size="sm" />
 Adhésions
 </button>
 </div>
 </div>

 {/* Content */}
 <div className="flex-1 overflow-y-auto p-6">
 {activeTab === 'general' && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <InfoCard title="Localisation" icon="MapPinIcon">
 <InfoRow label="Région" value={cooperative.region} />
 <InfoRow label="District" value={cooperative.district} />
 <InfoRow label="Commune" value={cooperative.commune} />
 <InfoRow label="Village" value={cooperative.village} />
 <InfoRow label="Fokontany" value={cooperative.fokontany} />
 </InfoCard>

 <InfoCard title="Contact" icon="PhoneIcon">
 <InfoRow label="Téléphone" value={cooperative.telephone} />
 <InfoRow label="Email" value={cooperative.email} />
 <InfoRow label="Site web" value={cooperative.site_web} />
 </InfoCard>

 {/* ✅ SECTION MEMBRES AJOUTÉE */}
 <InfoCard title="Membres" icon="UsersIcon">
 <InfoRow label="Nombre total" value={cooperative.nombre_membres || '-'} />
 <InfoRow label="Hommes" value={cooperative.nombre_hommes || '-'} />
 <InfoRow label="Femmes" value={cooperative.nombre_femmes || '-'} />
 <InfoRow label="Producteurs actifs" value={cooperative.nombre_producteurs || 0} />
 </InfoCard>

 <InfoCard title="Production" icon="SparklesIcon">
 <InfoRow label="Superficie totale" value={`${cooperative.superficie_totale_ha || 0} Ha`} />
 <InfoRow label="Année création coop" value={cooperative.annee_creation || '-'} />
 </InfoCard>

 <InfoCard title="Villages regroupés" icon="MapPinIcon">
 {cooperative.villages && cooperative.villages.length > 0 ? (
 <div className="flex flex-wrap gap-2">
 {cooperative.villages.map((village) => (
 <Badge key={village} variant="neutral" size="sm">{village}</Badge>
 ))}
 </div>
 ) : (
 <p className="text-gray-500">Aucun village regroupé détecté</p>
 )}
 </InfoCard>

 {(cooperative.description || cooperative.objectifs) && (
 <div className="md:col-span-2">
 <InfoCard title="Description" icon="DocumentTextIcon">
 {cooperative.description && (
 <div className="mb-4">
 <h4 className="font-semibold text-gray-700 mb-2">À propos</h4>
 <p className="text-gray-600">{cooperative.description}</p>
 </div>
 )}
 {cooperative.objectifs && (
 <div>
 <h4 className="font-semibold text-gray-700 mb-2">Objectifs</h4>
 <p className="text-gray-600">{cooperative.objectifs}</p>
 </div>
 )}
 </InfoCard>
 </div>
 )}

 <InfoCard title="Informations système" icon="Cog6ToothIcon">
 <InfoRow label="Date création" value={cooperative.date_creation ? new Date(cooperative.date_creation).toLocaleDateString('fr-FR') : '-'} />
 <InfoRow label="Date enregistrement" value={cooperative.date_enregistrement ? new Date(cooperative.date_enregistrement).toLocaleDateString('fr-FR') : '-'} />
 <InfoRow label="Créée par" value={cooperative.cree_par_info ? `${cooperative.cree_par_info.first_name} ${cooperative.cree_par_info.last_name}` : '-'} />
 </InfoCard>
 </div>
 )}

 {activeTab === 'responsables' && (
 <div className="space-y-4">
 <InfoCard title="Bureau de la coopérative" icon="BriefcaseIcon">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {/* Président */}
 {(() => {
 const president = cooperative.responsables?.find(r => 
 r.responsabilite_cooperative === 'president_coop'
 );
 return (
 <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
 <div className="flex items-center gap-2 mb-2">
 <Icon name="UserIcon" size="md" className="text-green-800" />
 <h4 className="font-bold text-green-800">Président</h4>
 </div>
 {president ? (
 <>
 <p className="font-semibold text-dark">{president.nom_complet}</p>
 {president.telephone && (
 <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
 <Icon name="PhoneIcon" size="sm" />
 {president.telephone}
 </p>
 )}
 <p className="text-sm text-gray-500 mt-1">Code: {president.code}</p>
 {president.village && (
 <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
 <Icon name="MapPinIcon" size="sm" />
 {president.village}
 </p>
 )}
 </>
 ) : (
 <p className="text-gray-500">Non renseigné</p>
 )}
 </div>
 );
 })()}

 {/* Secrétaire */}
 {(() => {
 const secretaire = cooperative.responsables?.find(r => 
 r.responsabilite_cooperative === 'secretaire_coop'
 );
 return (
 <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
 <div className="flex items-center gap-2 mb-2">
 <Icon name="DocumentTextIcon" size="md" className="text-blue-800" />
 <h4 className="font-bold text-blue-800">Secrétaire</h4>
 </div>
 {secretaire ? (
 <>
 <p className="font-semibold text-dark">{secretaire.nom_complet}</p>
 {secretaire.telephone && (
 <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
 <Icon name="PhoneIcon" size="sm" />
 {secretaire.telephone}
 </p>
 )}
 <p className="text-sm text-gray-500 mt-1">Code: {secretaire.code}</p>
 {secretaire.village && (
 <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
 <Icon name="MapPinIcon" size="sm" />
 {secretaire.village}
 </p>
 )}
 </>
 ) : (
 <p className="text-gray-500">Non renseigné</p>
 )}
 </div>
 );
 })()}

 {/* Trésorier */}
 {(() => {
 const tresorier = cooperative.responsables?.find(r => 
 r.responsabilite_cooperative === 'tresorier_coop'
 );
 return (
 <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200">
 <div className="flex items-center gap-2 mb-2">
 <Icon name="BanknotesIcon" size="md" className="text-yellow-800" />
 <h4 className="font-bold text-yellow-800">Trésorier</h4>
 </div>
 {tresorier ? (
 <>
 <p className="font-semibold text-dark">{tresorier.nom_complet}</p>
 {tresorier.telephone && (
 <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
 <Icon name="PhoneIcon" size="sm" />
 {tresorier.telephone}
 </p>
 )}
 <p className="text-sm text-gray-500 mt-1">Code: {tresorier.code}</p>
 {tresorier.village && (
 <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
 <Icon name="MapPinIcon" size="sm" />
 {tresorier.village}
 </p>
 )}
 </>
 ) : (
 <p className="text-gray-500">Non renseigné</p>
 )}
 </div>
 );
 })()}
 </div>
 </InfoCard>
 </div>
 )}

 {activeTab === 'adhesions' && (
 <div className="space-y-4">
 <div className="bg-white rounded-lg shadow p-6 mb-2">
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Granularité</label>
 <select
 value={adhFilters.granularite}
 onChange={(e) => setAdhFilters(prev => ({ ...prev, granularite: e.target.value }))}
 className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-200"
 >
 <option value="annee">Année</option>
 <option value="mois">Mois</option>
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Année début</label>
 <input
 type="number"
 value={adhFilters.start}
 onChange={(e) => setAdhFilters(prev => ({ ...prev, start: e.target.value }))}
 className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-200"
 placeholder="Ex: 2021"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Année fin</label>
 <input
 type="number"
 value={adhFilters.end}
 onChange={(e) => setAdhFilters(prev => ({ ...prev, end: e.target.value }))}
 className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-200"
 placeholder="Ex: 2025"
 />
 </div>
 <div className="flex items-end">
 <label className="flex items-center gap-2">
 <input
 type="checkbox"
 checked={adhFilters.actif}
 onChange={(e) => setAdhFilters(prev => ({ ...prev, actif: e.target.checked }))}
 className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
 />
 <span className="text-sm text-gray-700">Actifs seulement</span>
 </label>
 </div>
 </div>
 <div className="mt-4 flex gap-3">
 <Button
 onClick={loadAdhesions}
 variant="primary"
 size="md"
 >
 Appliquer
 </Button>
 <Button
 onClick={() => {
 if (!adhData?.series) return;
 let csv;
 if (adhData.granularite === 'mois') {
 csv = 'annee,mois,count\n' + adhData.series.map(s => `${s.annee},${String(s.mois).padStart(2,'0')},${s.count}`).join('\n');
 } else {
 csv = 'annee,count\n' + adhData.series.map(s => `${s.annee},${s.count}`).join('\n');
 }
 const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
 const url = window.URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url;
 link.setAttribute('download', `adhesions_coop_${cooperativeId}.csv`);
 document.body.appendChild(link);
 link.click();
 link.remove();
 }}
 disabled={!adhData?.series?.length}
 variant="secondary"
 size="md"
 icon="ArrowDownTrayIcon"
 >
 Exporter CSV
 </Button>
 </div>
 </div>

 <InfoCard title="Adhésions par période" icon="ChartBarIcon">
 {adhLoading ? (
 <div className="text-center py-8">
 <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto"></div>
 <p className="mt-3 text-gray-600">Chargement...</p>
 </div>
 ) : (
 <>
 {adhData?.series?.length > 0 ? (
 <Bar
 data={{
 labels: adhData.granularite === 'mois'
 ? adhData.series.map(s => `${s.annee}-${String(s.mois).padStart(2,'0')}`)
 : adhData.series.map(s => s.annee),
 datasets: [{
 label: 'Adhésions',
 data: adhData.series.map(s => s.count),
 backgroundColor: '#10B981',
 borderRadius: 8,
 }]
 }}
 options={{
 responsive: true,
 maintainAspectRatio: true,
 plugins: { legend: { display: false } },
 scales: { y: { beginAtZero: true } }
 }}
 />
 ) : (
 <div className="text-center py-8 text-gray-500">Aucune donnée</div>
 )}
 </>
 )}
 </InfoCard>

 {adhData?.series?.length > 0 && (
 <InfoCard title="Détail des adhésions" icon="DocumentTextIcon">
 <div className="overflow-x-auto">
 <table className="min-w-full divide-y divide-gray-200">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Période</th>
 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Adhésions</th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200">
 {adhData.series.map((s, idx) => (
 <tr key={idx} className="hover:bg-gray-50">
 <td className="px-4 py-3 text-sm text-gray-900">
 {adhData.granularite === 'mois' ? `${s.annee}-${String(s.mois).padStart(2,'0')}` : s.annee}
 </td>
 <td className="px-4 py-3 text-sm font-semibold text-dark">{s.count}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </InfoCard>
 )}
 </div>
 )}

 {activeTab === 'membres' && (
 <InfoCard title="Liste des membres producteurs" icon="UsersIcon">
 {cooperative.membres && cooperative.membres.length > 0 ? (
 <div className="overflow-x-auto">
 <table className="min-w-full divide-y divide-gray-200">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom Complet</th>
 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sexe</th>
 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Village</th>
 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Téléphone</th>
 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Responsabilité</th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200">
 {cooperative.membres.map((membre) => (
 <tr key={membre.id} className="hover:bg-gray-50">
 <td className="px-4 py-3 text-sm font-medium text-dark">{membre.code}</td>
 <td className="px-4 py-3 text-sm text-gray-900">{membre.nom_complet}</td>
 <td className="px-4 py-3 text-sm">
 <Badge variant={membre.sexe === 'M' ? 'info' : 'neutral'} size="sm">
 {membre.sexe === 'M' ? 'M' : 'F'}
 </Badge>
 </td>
 <td className="px-4 py-3 text-sm text-gray-600">{membre.village || '-'}</td>
 <td className="px-4 py-3 text-sm text-gray-600">{membre.telephone || '-'}</td>
 <td className="px-4 py-3 text-sm">
 {membre.responsabilite_cooperative && membre.responsabilite_cooperative !== 'aucune' ? (
 <Badge variant="success" size="sm">
 {membre.responsabilite_cooperative_display || membre.responsabilite_cooperative}
 </Badge>
 ) : (
 <span className="text-gray-400">-</span>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 ) : (
 <div className="text-center py-12">
 <Icon name="UsersIcon" size="xl" className="text-gray-400 mx-auto mb-4" />
 <p className="text-gray-500 text-lg">Aucun membre producteur</p>
 <p className="text-gray-400 text-sm mt-2">Les producteurs associés apparaîtront ici</p>
 </div>
 )}
 </InfoCard>
 )}
 </div>
 </div>
 </div>
 );
}

export default CooperativeDetails;
