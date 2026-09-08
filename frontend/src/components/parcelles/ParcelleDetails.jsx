import { useState, useEffect, useCallback } from 'react';
import { parcelleService } from '../../services/api';
import ParcelleMapViewFullscreen from './ParcelleMapViewFullscreen';
import { CanUpdate } from '../common/PermissionWrapper';
import Icon from '../common/Icon';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';
import ProductionHistoryChart from '../history/ProductionHistoryChart';

function ParcelleDetails({ parcelleId, onClose, onEdit }) {
 const [parcelle, setParcelle] = useState(null);
 const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState('general');
 const [showMapFullscreen, setShowMapFullscreen] = useState(false);

 const loadParcelle = useCallback(async () => {
 setLoading(true);
 try {
 const response = await parcelleService.getById(parcelleId);
 setParcelle(response.data);
 } catch (error) {
 console.error('Erreur:', error);
 alert('Erreur lors du chargement des détails');
 } finally {
 setLoading(false);
 }
 }, [parcelleId]);

 useEffect(() => {
 loadParcelle();
 }, [loadParcelle]);

 const tabs = [
 { id: 'general', label: 'Général', icon: 'DocumentTextIcon' },
 { id: 'culture', label: 'Culture', icon: 'SparklesIcon' },
 { id: 'historique', label: 'Historique', icon: 'ChartBarIcon' },
 ];

 if (loading) {
 return (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
 <div className="bg-white rounded-lg p-8">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
 <p className="text-center mt-4">Chargement...</p>
 </div>
 </div>
 );
 }

 if (!parcelle) return null;

 return (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
 {/* Header */}
 <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 flex-shrink-0">
 <div className="flex justify-between items-start">
 <div>
 <h2 className="text-2xl font-bold mb-2">{parcelle.code_parcelle}</h2>
 <p className="text-green-100">
 Parcelle n°{parcelle.numero_parcelle} - {parcelle.type_vanille}
 </p>
 <div className="flex gap-2 mt-3 flex-wrap">
 {parcelle.certifiee && (
 <Badge variant="success" size="md" icon="CheckBadgeIcon">
 Certifiée {parcelle.type_certification}
 </Badge>
 )}
 <Badge variant={parcelle.active ? 'success' : 'error'} size="md">
 {parcelle.active ? 'Active' : 'Inactive'}
 </Badge>
 {parcelle.latitude && parcelle.longitude && (
 <Button
 onClick={() => setShowMapFullscreen(true)}
 variant="ghost"
 size="sm"
 icon="MapIcon"
 className="text-white hover:bg-white hover:bg-opacity-20"
 >
 Voir carte
 </Button>
 )}
 {parcelle.polygon_geojson && (
 <Badge variant="info" size="md" icon="MapIcon">
 Délimitation disponible
 </Badge>
 )}
 </div>
 </div>
 <button
 onClick={onClose}
 className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2"
 aria-label="Fermer"
 >
 <Icon name="XMarkIcon" size="lg" />
 </button>
 </div>
 </div>

 {/* Statistiques rapides */}
 <div className="grid grid-cols-4 gap-4 p-6 bg-gray-50 border-b flex-shrink-0">
 <div className="text-center">
 <p className="text-2xl font-bold text-green-600">{parcelle.dimension_ha}</p>
 <p className="text-xs text-gray-600">Hectares</p>
 </div>
 <div className="text-center">
 <p className="text-2xl font-bold text-blue-600">{parcelle.nombre_pieds}</p>
 <p className="text-xs text-gray-600">Pieds de vanille</p>
 </div>
 <div className="text-center">
 <p className="text-2xl font-bold text-amber-600">{parcelle.estimation_production_kg}</p>
 <p className="text-xs text-gray-600">Kg estimés</p>
 </div>
 <div className="text-center">
 <p className="text-2xl font-bold text-purple-600">{parcelle.age_parcelle || 'N/A'}</p>
 <p className="text-xs text-gray-600">Ans</p>
 </div>
 </div>

 {/* Tabs */}
 <div className="flex border-b flex-shrink-0">
 {tabs.map(tab => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`flex-1 px-6 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
 activeTab === tab.id
 ? 'border-b-2 border-green-600 text-green-600'
 : 'text-gray-600 hover:text-gray-800'
 }`}
 >
 <Icon name={tab.icon} size="sm" />
 {tab.label}
 </button>
 ))}
 </div>

 {/* Contenu des tabs */}
 <div className="flex-1 overflow-y-auto p-6">
 {activeTab === 'general' && (
 <div className="space-y-6">
 {/* Producteur */}
 <Card title="Producteur" icon="UserIcon" padding="md">
 <div className="bg-gray-50 p-4 rounded-lg">
 <p className="font-semibold text-gray-800">{parcelle.producteur_nom}</p>
 <p className="text-sm text-gray-600">Code : {parcelle.producteur_code}</p>
 <p className="text-sm text-gray-600">Commune : {parcelle.producteur_commune}</p>
 </div>
 </Card>

 {/* Localisation */}
 <Card title="Localisation" icon="MapPinIcon" padding="md">
 <div className="space-y-2">
 <div className="flex justify-between py-2 border-b">
 <span className="text-gray-600">Localisation</span>
 <span className="font-medium">{parcelle.localisation}</span>
 </div>
 {parcelle.latitude && parcelle.longitude && (
 <>
 <div className="flex justify-between py-2 border-b">
 <span className="text-gray-600">Latitude</span>
 <span className="font-mono text-sm">{parcelle.latitude}</span>
 </div>
 <div className="flex justify-between py-2 border-b">
 <span className="text-gray-600">Longitude</span>
 <span className="font-mono text-sm">{parcelle.longitude}</span>
 </div>
 </>
 )}
 {parcelle.polygon_geojson && (
 <div className="flex justify-between py-2 border-b">
 <span className="text-gray-600">Délimitation</span>
 <Badge variant="success" size="sm">Disponible</Badge>
 </div>
 )}
 {parcelle.distance_habitation && (
 <div className="flex justify-between py-2 border-b">
 <span className="text-gray-600">Distance habitation</span>
 <span className="font-medium">{parcelle.distance_habitation_display || parcelle.distance_habitation}</span>
 </div>
 )}
 </div>
 </Card>

 {/* Propriété */}
 <Card title="Propriété" icon="HomeIcon" padding="md">
 <div className="space-y-2">
 <div className="flex justify-between py-2 border-b">
 <span className="text-gray-600">Type de propriété</span>
 <span className="font-medium capitalize">{parcelle.type_propriete_display || parcelle.type_propriete?.replace('_', ' ')}</span>
 </div>
 {parcelle.profil_parcelle && (
 <div className="flex justify-between py-2 border-b">
 <span className="text-gray-600">Profil</span>
 <span className="font-medium capitalize">{parcelle.profil_parcelle_display || parcelle.profil_parcelle.replace('_', ' ')}</span>
 </div>
 )}
 </div>
 </Card>
 </div>
 )}

 {activeTab === 'culture' && (
 <div className="space-y-6">
 {/* Culture principale + Vanille */}
 <Card title="Culture" icon="SparklesIcon" padding="md">
 <div className="space-y-2">
 <div className="flex justify-between py-2 border-b">
 <span className="text-gray-600">Culture principale</span>
 <span className="font-medium">{parcelle.culture_principale_display || parcelle.culture_principale}</span>
 </div>
 <div className="flex justify-between py-2 border-b">
 <span className="text-gray-600">Type de vanille</span>
 <span className="font-medium">{parcelle.type_vanille_display || parcelle.type_vanille}</span>
 </div>
 <div className="flex justify-between py-2 border-b">
 <span className="text-gray-600">Nombre de pieds</span>
 <span className="font-bold text-green-600">{parcelle.nombre_pieds}</span>
 </div>
 {parcelle.annee_plantation && (
 <div className="flex justify-between py-2 border-b">
 <span className="text-gray-600">Année de plantation</span>
 <span className="font-medium">{parcelle.annee_plantation}</span>
 </div>
 )}
 {parcelle.age_parcelle && (
 <div className="flex justify-between py-2 border-b">
 <span className="text-gray-600">Âge de la parcelle</span>
 <span className="font-medium">{parcelle.age_parcelle} ans</span>
 </div>
 )}
 <div className="flex justify-between py-2 border-b">
 <span className="text-gray-600">Production estimée totale</span>
 <span className="font-bold text-amber-600">{parcelle.estimation_production_kg} kg</span>
 </div>
 </div>
 </Card>

 {/* Productions par culture */}
 {parcelle.productions_par_culture && Object.keys(parcelle.productions_par_culture).length > 0 && (
 <Card title="Productions par culture" icon="ChartBarIcon" padding="md">
 <div className="bg-gradient-to-br from-green-50 to-blue-50 p-4 rounded-lg space-y-3">
 {Object.entries(parcelle.productions_par_culture).map(([culture, production]) => (
 <div key={culture} className="flex justify-between items-center py-2 px-3 bg-white rounded-md shadow-sm">
 <div className="flex items-center gap-2">
 <Icon 
 name={culture === 'vanille' ? 'SparklesIcon' : 
 culture === 'cafe' || culture === 'café' ? 'BeakerIcon' :
 culture === 'girofle' ? 'SparklesIcon' : 'CubeIcon'}
 size="md"
 className="text-green-600"
 />
 <span className="font-medium capitalize text-gray-700">{culture}</span>
 </div>
 <span className="font-bold text-amber-600">{production} kg</span>
 </div>
 ))}
 </div>
 </Card>
 )}

 {/* Cultures pratiquées */}
 {parcelle.cultures_pratiquees && parcelle.cultures_pratiquees.length > 0 && (
 <Card title="Cultures pratiquées" icon="SparklesIcon" padding="md">
 <div className="flex flex-wrap gap-2">
 {parcelle.cultures_pratiquees.map((culture, index) => (
 <Badge key={index} variant="success" size="md">
 {culture}
 </Badge>
 ))}
 </div>
 </Card>
 )}

 {/* Cultures autour */}
 {parcelle.cultures_autour && (
 <Card title="Cultures environnantes" icon="GlobeAltIcon" padding="md">
 <p className="text-gray-700">{parcelle.cultures_autour}</p>
 </Card>
 )}

 {/* Certification */}
 <Card title="Certification" icon="CheckBadgeIcon" padding="md">
 <div className="space-y-2">
 <div className="flex justify-between py-2 border-b">
 <span className="text-gray-600">Statut</span>
 <Badge variant={parcelle.certifiee ? 'success' : 'neutral'} size="sm" icon={parcelle.certifiee ? 'CheckCircleIcon' : undefined}>
 {parcelle.certifiee ? 'Certifiée' : 'Non certifiée'}
 </Badge>
 </div>
 {parcelle.certifiee && parcelle.type_certification && (
 <div className="flex justify-between py-2 border-b">
 <span className="text-gray-600">Type</span>
 <span className="font-medium uppercase">{parcelle.type_certification_display || parcelle.type_certification}</span>
 </div>
 )}
 </div>
 </Card>
 </div>
 )}

 {activeTab === 'historique' && (
 <div className="space-y-6">
 <Card title="Évolution de la Production" icon="ChartBarIcon" padding="md">
 <p className="text-sm text-gray-600 mb-4">
 Visualisation de l'évolution des productions par culture sur les 5 dernières années
 </p>
 <ProductionHistoryChart
 parcelleId={parcelle.id}
 anneeDebut={new Date().getFullYear() - 5}
 anneeFin={new Date().getFullYear()}
 cultures={parcelle.cultures_pratiquees || ['vanille']}
 />
 </Card>
 </div>
 )}

 </div>

 {/* Footer */}
 <div className="flex justify-end gap-3 p-6 bg-gray-50 border-t flex-shrink-0">
 <Button
 onClick={onClose}
 variant="secondary"
 size="md"
 >
 Fermer
 </Button>
 <CanUpdate>
 <Button
 onClick={onEdit}
 variant="primary"
 size="md"
 icon="PencilIcon"
 iconPosition="left"
 >
 Modifier
 </Button>
 </CanUpdate>
 </div>
 </div>

 {/* Carte plein écran */}
 {showMapFullscreen && parcelle.latitude && parcelle.longitude && (
 <ParcelleMapViewFullscreen
 parcelles={[parcelle]}
 onClose={() => setShowMapFullscreen(false)}
 enableDraw={false}
 />
 )}
 </div>
 );
}

export default ParcelleDetails;
