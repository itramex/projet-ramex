import { useState, useEffect, useCallback } from 'react';
import { producteurService, formationService, dotationService } from '../../services/api';
import { CanUpdate } from '../common/PermissionWrapper';
import Icon from '../common/Icon';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';
import SocialIndicatorChart from '../history/SocialIndicatorChart';

function ProducteurDetails({ producteurId, onClose, onEdit }) {
    const [producteur, setProducteur] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('general');


    const loadProducteur = useCallback(async () => {
        try {
            const response = await producteurService.getById(producteurId);
            setProducteur(response.data);
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors du chargement des détails');
        } finally {
            setLoading(false);
        }
    }, [producteurId]);

    useEffect(() => {
        loadProducteur();
    }, [loadProducteur]);



    const sections = [
        { id: 'fiche', label: 'Fiche récap', icon: 'ClipboardDocumentListIcon' },
        { id: 'cumuls', label: 'Cumulés', icon: 'ChartBarIcon' },
        { id: 'general', label: 'Général', icon: 'DocumentTextIcon' },
        { id: 'foyer', label: 'Ménages', icon: 'HomeIcon' },
        { id: 'cooperative', label: 'Coopérative', icon: 'UserGroupIcon' },
        { id: 'hygiene', label: 'Hygiène', icon: 'HeartIcon' },
        { id: 'environnement', label: 'Environnement', icon: 'GlobeAltIcon' },
        { id: 'activites', label: 'Activités', icon: 'BriefcaseIcon' },

        { id: 'social_indicators', label: 'Indicateurs sociaux', icon: 'ChartLineIcon' },
        { id: 'formations', label: 'Formations', icon: 'AcademicCapIcon' },
        { id: 'dotations', label: 'Dotations', icon: 'GiftIcon' },
    ];

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-yellow mx-auto"></div>
                    <p className="mt-4 text-gray-600">Chargement...</p>
                </div>
            </div>
        );
    }

    if (!producteur) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-6xl h-[95vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-6 rounded-t-lg flex-shrink-0">
                    <div className="flex justify-between items-start">
                        <div className="flex items-start gap-4">
                            {/* Photo */}
                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary-yellow bg-gray-200 flex-shrink-0">
                                {producteur.photo_url ? (
                                    <img
                                        src={producteur.photo_url}
                                        alt={producteur.nom_complet}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <Icon name={producteur.sexe === 'M' ? 'UserIcon' : 'UserIcon'} size="xl" />
                                    </div>
                                )}
                            </div>

                            {/* Infos principales */}
                            <div>
                                <h2 className="text-3xl font-bold mb-2">{producteur.nom_complet}</h2>
                                <div className="flex gap-4 text-sm">
                                    <Badge variant="neutral" size="md">
                                        {producteur.code}
                                    </Badge>
                                    <Badge variant={producteur.actif ? 'success' : 'error'} size="md" icon={producteur.actif ? 'CheckCircleIcon' : 'XCircleIcon'}>
                                        {producteur.actif ? 'Actif' : 'Inactif'}
                                    </Badge>
                                    {producteur.femme_leader && (
                                        <Badge variant="info" size="md" icon="SparklesIcon">
                                            Leader
                                        </Badge>
                                    )}
                                    {producteur.paysan_relais && (
                                        <Badge variant="warning" size="md" icon="MegaphoneIcon">
                                            Paysan Relais
                                        </Badge>
                                    )}
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Icon name="PhoneIcon" size="sm" className="text-gray-300" />
                                        <span>{producteur.telephone}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Icon name="MapPinIcon" size="sm" className="text-gray-300" />
                                        <span>{producteur.village}, {producteur.commune}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Icon name="CakeIcon" size="sm" className="text-gray-300" />
                                        <span>{producteur.age} ans</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Boutons d'action */}
                        <div className="flex gap-2">
                            <CanUpdate>
                                <Button
                                    onClick={() => onEdit(producteur)}
                                    variant="primary"
                                    size="md"
                                    icon="PencilIcon"
                                    iconPosition="left"
                                >
                                    Modifier
                                </Button>
                            </CanUpdate>
                            <button
                                onClick={onClose}
                                className="text-white hover:text-primary-yellow transition-colors p-2"
                                aria-label="Fermer"
                            >
                                <Icon name="XMarkIcon" size="lg" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Navigation sections */}
                <div className="border-b bg-gray-50 flex-shrink-0">
                    <div className="flex overflow-x-auto">
                        {sections.map(section => (
                            <button
                                key={section.id}
                                data-section={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`px-6 py-3 font-medium whitespace-nowrap transition-all flex items-center gap-2 ${activeSection === section.id
                                    ? 'bg-white text-gray-900 border-b-3 border-chick-yellow'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                    }`}
                            >
                                <Icon name={section.icon} size="sm" />
                                {section.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Contenu scrollable */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {activeSection === 'fiche' && <FicheRecapSection producteurId={producteurId} />}
                    {activeSection === 'cumuls' && <CumulsSection producteurId={producteurId} />}
                    {activeSection === 'general' && <GeneralSection producteur={producteur} />}
                    {activeSection === 'foyer' && <FoyerSection producteur={producteur} />}
                    {activeSection === 'cooperative' && <CooperativeSection producteur={producteur} />}
                    {activeSection === 'hygiene' && <HygieneSection producteur={producteur} />}
                    {activeSection === 'environnement' && <EnvironnementSection producteur={producteur} />}
                    {activeSection === 'activites' && <ActivitesSection producteur={producteur} />}

                    {activeSection === 'social_indicators' && <SocialIndicatorsSection producteur={producteur} />}
                    {activeSection === 'formations' && <FormationsSection producteur={producteur} />}
                    {activeSection === 'dotations' && <DotationsSection producteur={producteur} onUpdate={loadProducteur} />}
                </div>

                {/* Footer */}
                <div className="border-t p-4 bg-white flex justify-between items-center text-sm text-gray-600 flex-shrink-0">
                    <div>
                        Créé le {producteur.date_adhesion_cooperative ? new Date(producteur.date_adhesion_cooperative).toLocaleDateString('fr-FR') : 'Non renseigné'}
                        {producteur.cree_par_info && ` par ${producteur.cree_par_info.username}`}
                    </div>
                    {producteur.date_modification && (
                        <div>
                            Dernière modification : {new Date(producteur.date_modification).toLocaleDateString('fr-FR')}
                        </div>
                    )}
                </div>
            </div>


        </div>
    );
}

// ==================== SECTIONS ====================

function GeneralSection({ producteur }) {
    // Format currency (Ariary)
    const formatCurrency = (value) => {
        if (!value) return '0 Ar';
        return new Intl.NumberFormat('fr-MG', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value) + ' Ar';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard title="État Civil" icon="UserIcon">
                <InfoRow label="Nom complet" value={producteur.nom_complet} />
                <InfoRow label="CIN" value={producteur.cin} />
                <InfoRow label="Genre" value={producteur.sexe_display || (producteur.sexe === 'M' ? 'Masculin' : 'Féminin')} />
                <InfoRow label="Date de naissance" value={new Date(producteur.date_naissance).toLocaleDateString('fr-FR')} />
                <InfoRow label="Âge" value={`${producteur.age} ans`} />
                <InfoRow label="Statut matrimonial" value={producteur.statut_matrimonial_display || producteur.statut_matrimonial} />
                <InfoRow label="Niveau d'éducation" value={producteur.niveau_education_display || producteur.niveau_education} />
            </InfoCard>

            <InfoCard title="Contact & Localisation" icon="MapPinIcon">
                <InfoRow label="Téléphone" value={producteur.telephone} />
                <InfoRow label="Email" value={producteur.email || 'Non renseigné'} />
                <InfoRow label="Commune" value={producteur.commune} />
                <InfoRow label="Fokontany" value={producteur.fokontany || 'Non renseigné'} />
                <InfoRow label="Village" value={producteur.village} />
            </InfoCard>

            {/* AGR Summary Card */}
            {producteur.agr_activities && producteur.agr_activities.length > 0 && (
                <InfoCard title="Activités Génératrices de Revenus (AGR)" icon="CurrencyDollarIcon">
                    <InfoRow
                        label="Nombre d'AGR"
                        value={producteur.agr_activities.length}
                    />
                    <InfoRow
                        label="Revenu total AGR"
                        value={formatCurrency(producteur.total_revenu_agr)}
                        bold
                    />
                    <div className="mt-3 pt-3 border-t border-gray-200">
                        {producteur.agr_activities.map((agr) => (
                            <div key={agr.id} className="flex justify-between items-center py-1">
                                <span className="text-sm text-gray-600">
                                    {agr.type_agr_display || agr.type_agr}
                                </span>
                                <span className="text-sm text-green-600 font-medium">
                                    {formatCurrency(agr.revenu_annuel_estime)}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3">
                        <button
                            onClick={() => {
                                // Find the AGR section button and click it
                                const agrButton = document.querySelector('[data-section="agr"]');
                                if (agrButton) agrButton.click();
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                            <Icon name="ArrowRightIcon" size="sm" />
                            Voir les détails AGR
                        </button>
                    </div>
                </InfoCard>
            )}

            <InfoCard title="Dates importantes" icon="CalendarIcon">
                {producteur.date_adhesion_cooperative && (
                    <InfoRow label="Date d'adhésion coopérative" value={new Date(producteur.date_adhesion_cooperative).toLocaleDateString('fr-FR')} />
                )}
                {producteur.date_desactivation && (
                    <InfoRow label="Date de désactivation" value={new Date(producteur.date_desactivation).toLocaleDateString('fr-FR')} />
                )}
            </InfoCard>

            {!producteur.actif && producteur.raison_desactivation && (
                <InfoCard title="Raison de désactivation" icon="ExclamationTriangleIcon">
                    <p className="text-gray-700">{producteur.raison_desactivation}</p>
                </InfoCard>
            )}
        </div>
    );
}

function FoyerSection({ producteur }) {
    // Calculate number of children who should be in school (age 3-18)
    // Based on birth years from annee_naissance_enfant_1 to annee_naissance_enfant_10
    const calculateEnfantsDoitScolarises = () => {
        const currentYear = new Date().getFullYear();
        let count = 0;

        for (let i = 1; i <= 10; i++) {
            const birthYear = producteur[`annee_naissance_enfant_${i}`];
            if (birthYear) {
                const age = currentYear - birthYear;
                if (age >= 3 && age <= 18) {
                    count++;
                }
            }
        }

        return count;
    };

    const enfantsDoitScolarises = calculateEnfantsDoitScolarises();
    const tauxScolarisation = enfantsDoitScolarises > 0
        ? Math.round((producteur.nb_enfants_scolarises / enfantsDoitScolarises) * 100)
        : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard title="Composition du foyer" icon="HomeIcon">
                <InfoRow label="Adultes (18+ ans)" value={producteur.nb_adultes_plus_18} />
                <InfoRow label="Hommes adultes" value={producteur.nb_hommes_adultes} />
                <InfoRow label="Femmes adultes" value={producteur.nb_femmes_adultes} />
                <InfoRow label="Personne handicapée" value={producteur.personne_handicap_foyer ? 'Oui' : 'Non'} />
            </InfoCard>

            <InfoCard title="Enfants" icon="UserIcon">
                <InfoRow label="Garçons (propres)" value={producteur.nb_enfants_garcons} />
                <InfoRow label="Filles (propres)" value={producteur.nb_enfants_filles} />
                <InfoRow label="Autres garçons" value={producteur.nb_autres_garcons} />
                <InfoRow label="Autres filles" value={producteur.nb_autres_filles} />
                <InfoRow label="Total enfants" value={producteur.total_enfants} bold />
            </InfoCard>

            <InfoCard title="Scolarisation" icon="AcademicCapIcon">
                <InfoRow label="Enfants scolarisés" value={producteur.nb_enfants_scolarises} />
                <InfoRow label="Enfants non scolarisés" value={producteur.nb_enfants_non_scolarises} />
                <InfoRow label="Enfants en âge scolaire (3-18 ans)" value={enfantsDoitScolarises} />
                <InfoRow
                    label="Taux de scolarisation"
                    value={`${tauxScolarisation}%`}
                    bold
                />
                {producteur.dotations && (
                    <InfoRow
                        label="Kits scolaires reçus"
                        value={producteur.dotations.filter(d => d.type_dotation === 'kit_scolaire').reduce((acc, cur) => acc + cur.quantite, 0) > 0
                            ? `Oui (${producteur.dotations.filter(d => d.type_dotation === 'kit_scolaire').reduce((acc, cur) => acc + cur.quantite, 0)})`
                            : 'Non'}
                    />
                )}
            </InfoCard>
        </div>
    );
}

function CooperativeSection({ producteur }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard title="Coopérative" icon="UserGroupIcon">
                <InfoRow label="Nom" value={producteur.cooperative_info?.nom || 'Aucune'} />
                <InfoRow label="Responsabilité" value={producteur.responsabilite_cooperative_display || producteur.responsabilite_cooperative} />
                <InfoRow label="Paysan relais" value={producteur.paysan_relais ? 'Oui' : 'Non'} />
                {producteur.date_adhesion_cooperative && (
                    <InfoRow
                        label="Adhésion coop"
                        value={new Date(producteur.date_adhesion_cooperative).toLocaleDateString('fr-FR')}
                    />
                )}
            </InfoCard>

            <InfoCard title="Groupement d'épargne" icon="BanknotesIcon">
                <InfoRow label="Membre VSLA" value={producteur.membre_groupement_epargne ? 'Oui' : 'Non'} />
                {producteur.membre_groupement_epargne && producteur.date_adhesion_groupement && (
                    <InfoRow
                        label="Date d'adhésion"
                        value={new Date(producteur.date_adhesion_groupement).toLocaleDateString('fr-FR')}
                    />
                )}
            </InfoCard>
        </div>
    );
}

function HygieneSection({ producteur }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard title="Gestion des déchets" icon="TrashIcon">
                <CheckItem label="Poubelles triées" checked={producteur.a_poubelles_triees} />
                <CheckItem label="Déchets non éparpillés (maison)" checked={producteur.dechets_non_eparpilles_maison} />
                <CheckItem label="Déchets non éparpillés (parcelle)" checked={producteur.dechets_non_eparpilles_parcelle} />
                <CheckItem label="Pratique le recyclage" checked={producteur.recyclage_dechets} />
                <CheckItem label="Déchets chimiques enterrés" checked={producteur.dechets_chimiques_enterres} />
            </InfoCard>

            <InfoCard title="Gestion de l'eau" icon="BeakerIcon">
                <CheckItem label="Fosse eaux usées (maison)" checked={producteur.fosse_eaux_usees_maison} />
                <CheckItem label="Fosse eaux usées (champ)" checked={producteur.fosse_eaux_usees_champ} />
                <CheckItem label="WC maison" checked={producteur.wc_maison} />
                <CheckItem label="WC champ" checked={producteur.wc_champ} />
                <CheckItem label="Eau potable" checked={producteur.eau_potable} />
                <InfoRow label="Source d'eau" value={producteur.source_eau_display || producteur.source_eau || 'Non renseigné'} />
            </InfoCard>

            <InfoCard title="Santé" icon="HeartIcon">
                <InfoRow label="Type de centre" value={producteur.type_centre_sante_display || producteur.type_centre_sante || 'Non renseigné'} />
                <CheckItem label="Assurance santé" checked={producteur.a_assurance_sante} />
            </InfoCard>
        </div>
    );
}

function EnvironnementSection({ producteur }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard title="Protection environnementale" icon="GlobeAltIcon">
                <CheckItem label="Respecte les dina" checked={producteur.respecte_dina} />
                <CheckItem label="Participe aux travaux communautaires" checked={producteur.participe_travaux_communautaires} />
                <CheckItem label="Protection environnement" checked={producteur.participe_protection_environnement} />
                <CheckItem label="Ne brûle pas la forêt" checked={producteur.ne_brule_pas_foret} />
                <CheckItem label="Ne coupe pas la forêt" checked={producteur.ne_coupe_pas_foret} />
                <CheckItem label="Ne cultive pas en zone protégée" checked={producteur.ne_cultive_pas_zone_protegee} />
                <CheckItem label="Respecte loi animaux protégés" checked={producteur.respecte_loi_animaux_proteges} />
            </InfoCard>

            <InfoCard title="Produits chimiques" icon="BeakerIcon">
                <CheckItem label="Utilise chimiques (autres cultures)" checked={producteur.utilise_chimiques_autres_cultures} />
                <CheckItem label="Stocke chimiques à la maison" checked={producteur.stocke_chimiques_maison} />
                <CheckItem label="Lieu nettoyage outils" checked={producteur.lieu_nettoyage_outils_chimiques} />
            </InfoCard>
        </div>
    );
}

function ActivitesSection({ producteur }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard title="Chasse & Élevage" icon="SparklesIcon">
                <CheckItem label="Pratique la chasse" checked={producteur.pratique_chasse} />
                {producteur.pratique_chasse && producteur.animaux_chasses && (
                    <InfoRow label="Animaux chassés" value={producteur.animaux_chasses} />
                )}
                <CheckItem label="Pratique l'élevage" checked={producteur.pratique_elevage} />
                {producteur.pratique_elevage && producteur.animaux_eleves && (
                    <InfoRow label="Animaux élevés" value={producteur.animaux_eleves} />
                )}
            </InfoCard>

            <InfoCard title="Activités agricoles" icon="BriefcaseIcon">
                <CheckItem label="Exploité forêt après 2019" checked={producteur.a_exploite_foret_apres_2019} />
                <CheckItem label="Pratique le Tavy" checked={producteur.pratique_tavy} />
                <CheckItem label="Fait du défrichage" checked={producteur.fait_defrichage} />
                <CheckItem label="Pratique la pêche" checked={producteur.pratique_peche} />
                {producteur.pratique_peche && (
                    <>
                        <CheckItem label="Pêche en mer" checked={producteur.peche_mer} indent />
                        <CheckItem label="Pêche en eau douce" checked={producteur.peche_eau_douce} indent />
                        <CheckItem label="Respecte règles de pêche" checked={producteur.respecte_regles_peche} indent />
                    </>
                )}
            </InfoCard>
        </div>
    );
}



function SocialIndicatorsSection({ producteur }) {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 5; // Last 5 years

    const indicators = [
        { type: 'scolarisation', label: 'Taux de scolarisation' },
        { type: 'eau_potable', label: 'Accès à l\'eau potable' },
        { type: 'sante', label: 'Accès aux soins' },
        { type: 'habitat', label: 'Type de logement' },
        { type: 'energie', label: 'Accès à l\'énergie' },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {indicators.map((indicator) => (
                    <Card
                        key={indicator.type}
                        title={indicator.label}
                        icon="ChartLineIcon"
                        padding="md"
                    >
                        <SocialIndicatorChart
                            producteurId={producteur.id}
                            typeIndicateur={indicator.type}
                            anneeDebut={startYear}
                            anneeFin={currentYear}
                        />
                    </Card>
                ))}
            </div>
        </div>
    );
}

function FormationsSection({ producteur }) {
    const [formations, setFormations] = useState([]);
    const [certifications, setCertifications] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    const loadFormationsEtCertifications = useCallback(async () => {
        try {
            setLoadingData(true);
            const [formationsRes, certificationsRes] = await Promise.all([
                formationService.getFormationsByProducteur(producteur.id),
                formationService.getCertificationsByProducteur(producteur.id)
            ]);
            setFormations(formationsRes.data || []);
            setCertifications(certificationsRes.data || []);
        } catch (error) {
            console.error('Erreur chargement formations/certifications:', error);
        } finally {
            setLoadingData(false);
        }
    }, [producteur.id]);

    useEffect(() => {
        loadFormationsEtCertifications();
    }, [loadFormationsEtCertifications]);

    const getStatutBadge = (statut) => {
        const variantMap = {
            valide: 'success',
            expire: 'error',
            en_cours: 'warning',
            suspendu: 'neutral',
        };
        const labels = {
            valide: 'Valide',
            expire: 'Expiré',
            en_cours: 'En cours',
            suspendu: 'Suspendu',
        };
        return (
            <Badge variant={variantMap[statut] || 'neutral'} size="sm">
                {labels[statut] || statut}
            </Badge>
        );
    };

    if (loadingData) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-6">
            {/* Certifications */}
            <InfoCard title={`Certifications (${certifications.length})`} icon="CheckBadgeIcon">
                {certifications.length === 0 ? (
                    <p className="text-gray-500 italic">Aucune certification enregistrée</p>
                ) : (
                    <div className="space-y-4">
                        {certifications.map((cert) => (
                            <div key={cert.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-semibold text-gray-900">{cert.type_certification_nom}</h4>
                                        <p className="text-xs text-gray-500">{cert.type_certification_code}</p>
                                    </div>
                                    {getStatutBadge(cert.statut)}
                                </div>
                                <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                                    {cert.numero_certificat && (
                                        <div>
                                            <span className="text-gray-600">N° Certificat:</span>
                                            <p className="font-medium text-gray-900">{cert.numero_certificat}</p>
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-gray-600">Date obtention:</span>
                                        <p className="font-medium text-gray-900">
                                            {new Date(cert.date_obtention).toLocaleDateString('fr-FR')}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Date expiration:</span>
                                        <p className="font-medium text-gray-900">
                                            {new Date(cert.date_expiration).toLocaleDateString('fr-FR')}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Statut:</span>
                                        <p className="font-medium flex items-center gap-1">
                                            {cert.est_valide ? (
                                                <>
                                                    <Icon name="CheckCircleIcon" size="sm" className="text-green-600" />
                                                    <span className="text-green-600">Valide</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Icon name="XCircleIcon" size="sm" className="text-red-600" />
                                                    <span className="text-red-600">Non valide</span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </InfoCard>

            {/* Formations */}
            <InfoCard title={`Formations suivies (${formations.length})`} icon="AcademicCapIcon">
                {formations.length === 0 ? (
                    <p className="text-gray-500 italic">Aucune formation enregistrée</p>
                ) : (
                    <div className="space-y-4">
                        {formations.map((formation) => (
                            <div key={formation.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-semibold text-gray-900">{formation.type_formation_nom}</h4>
                                        <p className="text-sm text-gray-600">
                                            {new Date(formation.date_formation).toLocaleDateString('fr-FR')}
                                        </p>
                                    </div>
                                    {formation.certificat_obtenu && (
                                        <Badge variant="success" size="sm" icon="AcademicCapIcon">
                                            Certificat obtenu
                                        </Badge>
                                    )}
                                </div>
                                {formation.lieu && (
                                    <div className="mt-2 flex items-center gap-1">
                                        <Icon name="MapPinIcon" size="sm" className="text-gray-600" />
                                        <span className="text-xs text-gray-600">Lieu: </span>
                                        <span className="text-sm text-gray-900">{formation.lieu}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </InfoCard>

            {/* Dotations reçues (ancien champ) */}
            {producteur.dotations_recues && (
                <InfoCard title="Dotations reçues" icon="GiftIcon">
                    <p className="text-gray-700 whitespace-pre-wrap">{producteur.dotations_recues}</p>
                </InfoCard>
            )}
        </div>
    );
}

// ==================== COMPOSANTS UTILITAIRES ====================

function InfoCard({ title, icon, children }) {
    return (
        <Card title={title} icon={icon} padding="md" className="bg-white">
            <div className="space-y-3">
                {children}
            </div>
        </Card>
    );
}

function InfoRow({ label, value, bold = false }) {
    return (
        <div className="flex justify-between items-center py-1">
            <span className="text-gray-600 text-sm">{label}</span>
            <span className={`text-gray-900 ${bold ? 'font-bold text-chick-yellow' : ''}`}>
                {value}
            </span>
        </div>
    );
}

function CheckItem({ label, checked, indent = false }) {
    return (
        <div className={`flex items-center gap-2 py-1 ${indent ? 'ml-6' : ''}`}>
            <Icon
                name={checked ? 'CheckCircleIcon' : 'XCircleIcon'}
                size="sm"
                className={checked ? 'text-green-500' : 'text-red-500'}
            />
            <span className={`text-sm ${checked ? 'text-gray-700' : 'text-gray-500'}`}>
                {label}
            </span>
        </div>
    );
}

function DotationsSection({ producteur, onUpdate }) {
    const [showModal, setShowModal] = useState(false);
    const dotations = producteur.dotations || [];
    const cumulParType = dotations.reduce((acc, d) => {
        const key = d.type_dotation || 'autre';
        acc[key] = (acc[key] || 0) + (d.quantite || 0);
        return acc;
    }, {});
    const cumulParAnnee = dotations.reduce((acc, d) => {
        const key = d.annee || 'N/A';
        acc[key] = (acc[key] || 0) + (d.quantite || 0);
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-dark">Dotations reçues</h3>
                <CanUpdate>
                    <Button
                        onClick={() => setShowModal(true)}
                        variant="primary"
                        size="md"
                        icon="PlusIcon"
                        iconPosition="left"
                    >
                        Ajouter
                    </Button>
                </CanUpdate>
            </div>

            <InfoCard title="Cumul par type et par année" icon="ChartBarIcon">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Par type</p>
                        {Object.keys(cumulParType).length === 0 ? (
                            <p className="text-gray-500 italic">Aucune donnée</p>
                        ) : (
                            <div className="space-y-1">
                                {Object.entries(cumulParType).map(([type, total]) => (
                                    <InfoRow key={type} label={type} value={total} />
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Par année</p>
                        {Object.keys(cumulParAnnee).length === 0 ? (
                            <p className="text-gray-500 italic">Aucune donnée</p>
                        ) : (
                            <div className="space-y-1">
                                {Object.entries(cumulParAnnee)
                                    .sort((a, b) => Number(a[0]) - Number(b[0]))
                                    .map(([annee, total]) => (
                                        <InfoRow key={annee} label={annee} value={total} />
                                    ))}
                            </div>
                        )}
                    </div>
                </div>
            </InfoCard>

            <InfoCard title={`Historique (${producteur.dotations?.length || 0})`} icon="GiftIcon">
                {(!producteur.dotations || producteur.dotations.length === 0) ? (
                    <p className="text-gray-500 italic">Aucune dotation enregistrée via le nouveau système.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Année</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantité</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Détails</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {producteur.dotations.map((d) => (
                                    <tr key={d.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{d.annee}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <Badge variant="neutral" size="sm">
                                                {d.type_dotation === 'kit_scolaire' ? 'Kit Scolaire' :
                                                    d.type_dotation === 'poisson' ? 'Poisson' :
                                                        d.type_dotation === 'volaille' ? 'Volaille' : d.type_dotation}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{d.quantite}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{d.details || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </InfoCard>

            {/* Legacy display just in case */}
            {producteur.dotations_recues && (
                <InfoCard title="Ancien historique (Legacy)" icon="DocumentTextIcon">
                    <p className="text-gray-700 whitespace-pre-wrap">{producteur.dotations_recues}</p>
                </InfoCard>
            )}

            {showModal && (
                <AddDotationModal
                    producteurId={producteur.id}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => { setShowModal(false); onUpdate(); }}
                />
            )}
        </div>
    );
}

function AddDotationModal({ producteurId, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        type_dotation: 'kit_scolaire',
        annee: new Date().getFullYear(),
        quantite: 1,
        details: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await dotationService.create({ ...formData, producteur: producteurId });
            onSuccess();
        } catch (error) {
            console.error(error);
            alert('Erreur lors de la création');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">Ajouter une dotation</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Type</label>
                        <select
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={formData.type_dotation}
                            onChange={e => setFormData({ ...formData, type_dotation: e.target.value })}
                        >
                            <option value="kit_scolaire">Kit Scolaire</option>
                            <option value="poisson">Poisson</option>
                            <option value="volaille">Volaille</option>
                            <option value="autre">Autre</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Année</label>
                            <input
                                type="number"
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                value={formData.annee}
                                onChange={e => setFormData({ ...formData, annee: parseInt(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Quantité</label>
                            <input
                                type="number"
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                value={formData.quantite}
                                min="1"
                                onChange={e => setFormData({ ...formData, quantite: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Détails</label>
                        <textarea
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={formData.details}
                            onChange={e => setFormData({ ...formData, details: e.target.value })}
                            rows="2"
                        />
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button
                            type="button"
                            onClick={onClose}
                            variant="secondary"
                            size="md"
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            variant="primary"
                            size="md"
                            loading={loading}
                        >
                            Enregistrer
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
// ==================== FICHE RÉCAPITULATIVE (#9) ====================
function FicheRecapSection({ producteurId }) {
    const [fiche, setFiche] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadFiche = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await producteurService.getFiche(producteurId);
            setFiche(response.data);
        } catch (err) {
            console.error('Erreur fiche:', err);
            setError('Erreur lors du chargement de la fiche récapitulative');
        } finally {
            setLoading(false);
        }
    }, [producteurId]);

    useEffect(() => { loadFiche(); }, [loadFiche]);

    if (loading) return <p className="text-gray-500 text-center py-8">Chargement de la fiche...</p>;
    if (error) return <p className="text-red-600 text-center py-8">{error}</p>;
    if (!fiche) return null;

    const idt = fiche.identite || {};
    const coop = fiche.cooperative || {};
    const men = fiche.menage || {};
    const par = fiche.parcelles || {};
    const Box = ({ title, children }) => (
        <div className="bg-white rounded-lg shadow-md p-5">
            <h4 className="font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-3">{title}</h4>
            {children}
        </div>
    );
    const Row = ({ label, value }) => (
        <div className="flex justify-between text-sm py-1 border-b border-gray-50">
            <span className="text-gray-500">{label}</span>
            <span className="font-medium text-gray-800 text-right">{value ?? '—'}</span>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">
                    Fiche récapitulative — {idt.nom_complet} ({idt.code})
                </h3>
                <Button variant="secondary" icon="PrinterIcon" onClick={() => window.print()}>
                    Imprimer
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Box title="Identité">
                    <Row label="Code" value={idt.code} />
                    <Row label="Sexe" value={idt.sexe} />
                    <Row label="Âge" value={idt.age ? `${idt.age} ans` : '—'} />
                    <Row label="Téléphone" value={idt.telephone} />
                    <Row label="Éducation" value={idt.niveau_education} />
                    <Row label="Statut matrimonial" value={idt.statut_matrimonial} />
                    <Row label="Statut" value={idt.actif ? 'Actif' : 'Inactif'} />
                </Box>
                <Box title="Coopérative">
                    <Row label="Coopérative" value={coop.nom} />
                    <Row label="Code" value={coop.code} />
                    <Row label="Responsabilité" value={coop.responsabilite} />
                    <Row label="Adhésion" value={coop.date_adhesion ? new Date(coop.date_adhesion).toLocaleDateString('fr-FR') : '—'} />
                </Box>
                <Box title="Ménage">
                    <Row label="Adultes (18+)" value={men.nb_adultes_plus_18 ?? '—'} />
                    <Row label="Enfants scolarisés" value={men.nb_enfants_scolarises ?? '—'} />
                    <Row label="Enfants non scolarisés" value={men.nb_enfants_non_scolarises ?? '—'} />
                    <Row label="Total enfants" value={men.total_enfants ?? '—'} />
                    <Row label="Taux scolarisation" value={men.taux_scolarisation != null ? `${Number(men.taux_scolarisation).toFixed(1)} %` : '—'} />
                </Box>
            </div>

            <Box title={`Parcelles (${par.total || 0}) — ${par.superficie_totale || 0} ha · estimation ${par.estimation_totale || 0} kg · ${par.nb_pieds_total || 0} pieds`}>
                {par.liste?.length ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead><tr className="text-left text-gray-500 border-b">
                                <th className="py-2 pr-4">Code</th><th className="py-2 pr-4">Type vanille</th>
                                <th className="py-2 pr-4">Superficie (ha)</th><th className="py-2 pr-4">Pieds</th>
                                <th className="py-2 pr-4">Estimation (kg)</th><th className="py-2">Cultures</th>
                            </tr></thead>
                            <tbody>
                                {par.liste.map((pa) => (
                                    <tr key={pa.id} className="border-b border-gray-50">
                                        <td className="py-2 pr-4 font-medium">{pa.code}</td>
                                        <td className="py-2 pr-4">{pa.type_vanille || '—'}</td>
                                        <td className="py-2 pr-4">{pa.superficie} ha</td>
                                        <td className="py-2 pr-4">{pa.nb_pieds}</td>
                                        <td className="py-2 pr-4">{pa.estimation}</td>
                                        <td className="py-2">{Array.isArray(pa.cultures) ? pa.cultures.join(', ') : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : <p className="text-gray-400 text-sm">Aucune parcelle enregistrée.</p>}
            </Box>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Box title={`Formations (${fiche.formations?.total ?? 0}) — dont ${fiche.formations?.avec_certificat ?? 0} avec certificat`}>
                    {fiche.formations?.liste?.length ? fiche.formations.liste.map((f, i) => (
                        <Row key={i} label={`${f.type} (${f.date ? new Date(f.date).toLocaleDateString('fr-FR') : '—'})${f.certificat ? ' certificat' : ''}`}
                            value={f.organisme || '—'} />
                    )) : <p className="text-gray-400 text-sm">Aucune formation.</p>}
                </Box>
                <Box title={`Certifications (${fiche.certifications?.total ?? 0})`}>
                    {fiche.certifications?.liste?.length ? fiche.certifications.liste.map((c, i) => (
                        <Row key={i} label={`${c.type} (${c.statut})`}
                            value={`${c.numero || '—'} — obtention ${c.date_obtention ? new Date(c.date_obtention).toLocaleDateString('fr-FR') : '—'}`} />
                    )) : <p className="text-gray-400 text-sm">Aucune certification.</p>}
                </Box>
                <Box title={`Dotations (${fiche.dotations?.total ?? 0}) — cumul ${fiche.dotations?.cumul_total ?? 0}`}>
                    {Object.entries(fiche.dotations?.cumul_par_type || {}).map(([type, qty]) => (
                        <Row key={type} label={type} value={qty} />
                    ))}
                    {!fiche.dotations?.liste?.length && <p className="text-gray-400 text-sm">Aucune dotation.</p>}
                </Box>
                <Box title={`AGR (${fiche.agr?.total ?? 0}) — revenu total ${fiche.agr?.revenu_total ?? 0} Ar`}>
                    {fiche.agr?.liste?.length ? fiche.agr.liste.map((a, i) => (
                        <Row key={i} label={a.type_agr || '—'} value={`${a.revenu_annuel ?? 0} Ar${a.annee ? ` (${a.annee})` : ''}`} />
                    )) : <p className="text-gray-400 text-sm">Aucune activité AGR.</p>}
                </Box>
            </div>

            {fiche.annees_historique?.length > 0 && (
                <Box title="Années archivées">
                    <p className="text-sm text-gray-600">{fiche.annees_historique.join(' · ')}</p>
                </Box>
            )}
        </div>
    );
}


// ==================== CUMULÉS MULTI-ANNÉES (#8) ====================
function CumulsSection({ producteurId }) {
    const [cumuls, setCumuls] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadCumuls = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await producteurService.getCumuls(producteurId);
            setCumuls(response.data);
        } catch (err) {
            console.error('Erreur cumuls:', err);
            setError('Erreur lors du chargement des cumuls');
        } finally {
            setLoading(false);
        }
    }, [producteurId]);

    useEffect(() => { loadCumuls(); }, [loadCumuls]);

    if (loading) return <p className="text-gray-500 text-center py-8">Chargement des cumuls...</p>;
    if (error) return <p className="text-red-600 text-center py-8">{error}</p>;
    if (!cumuls) return null;

    const { producteur: prod, annees, estimations, dotations, agr, realisations, social_par_annee } = cumuls;
    const fmt = (n) => (n ?? 0).toLocaleString('fr-FR');
    const byYear = (obj, annee) => (obj?.[annee] ?? null);

    const rows = (annees || []).map((annee) => {
        const est = byYear(estimations?.par_annee, annee);
        const dot = byYear(dotations?.par_annee, annee);
        const agrY = byYear(agr?.par_annee, annee);
        const real = byYear(realisations?.par_annee, annee);
        const social = byYear(social_par_annee, annee);
        return (
            <tr key={annee} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2 pr-4 font-semibold">{annee}</td>
                <td className="py-2 pr-4">{est ? fmt(est.quantite_kg) : '—'}</td>
                <td className="py-2 pr-4">{est ? `${fmt(est.revenu)} Ar` : '—'}</td>
                <td className="py-2 pr-4">{dot ? fmt(dot.total) : '—'}</td>
                <td className="py-2 pr-4">{agrY ? `${fmt(agrY.revenu)} Ar` : '—'}</td>
                <td className="py-2 pr-4">{real ? fmt(real.poids_kg) : '—'}</td>
                <td className="py-2 pr-4">{real ? `${fmt(real.montant)} Ar` : '—'}</td>
                <td className="py-2">{social ? `${social.enfants_scolarises} enfant(s)` : '—'}</td>
            </tr>
        );
    });

    const Card = ({ title, value, sub }) => (
        <div className="bg-white rounded-lg shadow-md p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase">{title}</h4>
            <p className="text-lg font-bold text-gray-800 mt-1">{value}</p>
            {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">
                    Cumulés multi-années — {prod?.nom_complet} ({prod?.code})
                </h3>
                <Button variant="secondary" icon="ArrowPathIcon" onClick={loadCumuls}>
                    Actualiser
                </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card title="Estimations" value={`${fmt(estimations?.total_kg)} kg`} sub={`Revenu estimé : ${fmt(estimations?.total_revenu)} Ar`} />
                <Card title="Dotations" value={fmt(dotations?.total)} sub={Object.keys(dotations?.par_type || {}).length ? Object.entries(dotations.par_type).map(([t, q]) => `${t}: ${q}`).join(' · ') : 'Aucune'} />
                <Card title="AGR" value={`${fmt(agr?.revenu_total)} Ar`} sub={Object.keys(agr?.par_type || {}).length ? Object.entries(agr.par_type).map(([t, v]) => `${t}: ${fmt(v)}`).join(' · ') : 'Aucune activité'} />
                <Card title="Réalisations" value={`${fmt(realisations?.total_kg)} kg`} sub={`${realisations?.nb_bons ?? 0} bon(s) · ${fmt(realisations?.total_montant)} Ar`} />
            </div>

            {(annees || []).length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <p className="text-gray-500">Aucune donnée historique pour ce producteur.</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-md p-5 overflow-x-auto">
                    <h4 className="font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-3">Ventilation par année</h4>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-200">
                                <th className="py-2 pr-4">Année</th>
                                <th className="py-2 pr-4">Estimation (kg)</th>
                                <th className="py-2 pr-4">Revenu estimé</th>
                                <th className="py-2 pr-4">Dotations</th>
                                <th className="py-2 pr-4">AGR</th>
                                <th className="py-2 pr-4">Collecté (kg)</th>
                                <th className="py-2 pr-4">Montant collecte</th>
                                <th className="py-2">Scolarisation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows}
                            <tr className="border-t-2 border-gray-300 font-bold bg-gray-50">
                                <td className="py-2 pr-4">TOTAL</td>
                                <td className="py-2 pr-4">{fmt(estimations?.total_kg)}</td>
                                <td className="py-2 pr-4">{fmt(estimations?.total_revenu)} Ar</td>
                                <td className="py-2 pr-4">{fmt(dotations?.total)}</td>
                                <td className="py-2 pr-4">{fmt(agr?.revenu_total)} Ar</td>
                                <td className="py-2 pr-4">{fmt(realisations?.total_kg)}</td>
                                <td className="py-2 pr-4">{fmt(realisations?.total_montant)} Ar</td>
                                <td className="py-2">{Object.values(social_par_annee || {}).reduce((s, v) => s + (v.enfants_scolarises || 0), 0)} enfant(s)</td>
                            </tr>
                        </tbody>
                    </table>
                    {Object.keys(estimations?.par_culture || {}).length > 0 && (
                        <p className="text-xs text-gray-500 mt-3">
                            Estimations par culture : {Object.entries(estimations.par_culture).map(([c, v]) => `${c} ${fmt(v.quantite_kg)} kg`).join(' · ')}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}


export default ProducteurDetails;
