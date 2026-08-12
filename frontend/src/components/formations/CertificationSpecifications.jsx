import { useState, useEffect } from 'react';
import { formationService } from '../../services/api';
import Icon from '../common/Icon';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';

function CertificationSpecifications() {
  const [certificationTypes, setCertificationTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCertification, setSelectedCertification] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    loadCertificationTypes();
  }, []);

  const loadCertificationTypes = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all certification types
      const response = await formationService.getAllTypesCertifications();
      const types = response.data.results || response.data;

      setCertificationTypes(types);
    } catch (err) {
      console.error('Erreur chargement types de certifications:', err);
      setError(err.response?.data?.detail || 'Erreur lors du chargement des certifications');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (certId, section) => {
    setExpandedSections(prev => ({
      ...prev,
      [`${certId}-${section}`]: !prev[`${certId}-${section}`]
    }));
  };

  const handleBack = () => {
    setSelectedCertification(null);
  };

  // Certification specifications data (this would ideally come from backend or be configurable)
  const certificationSpecifications = {
    'RA': {
      nom: 'Rainforest Alliance',
      description: 'Certification pour l\'agriculture durable et la conservation de la biodiversité',
      organisme: 'Rainforest Alliance',
      duree_validite: '3 ans',
      exigences: [
        'Respect des normes environnementales strictes',
        'Protection de la biodiversité et des écosystèmes',
        'Bonnes pratiques agricoles durables',
        'Respect des droits des travailleurs',
        'Gestion responsable des ressources naturelles',
        'Interdiction de la déforestation',
        'Utilisation responsable des produits chimiques'
      ],
      processus_validation: [
        'Audit initial par un organisme certificateur accrédité',
        'Évaluation des pratiques agricoles et de gestion',
        'Vérification de la conformité aux critères RA',
        'Inspection des exploitations et des installations',
        'Formation des producteurs aux normes RA',
        'Mise en place de plans d\'amélioration continue',
        'Audits de suivi annuels'
      ],
      documents_requis: [
        'Preuves de propriété ou de droit d\'usage des terres',
        'Registres des pratiques agricoles',
        'Preuves de formation des travailleurs',
        'Plans de gestion environnementale',
        'Documents de traçabilité des produits',
        'Preuves de conformité aux réglementations locales'
      ]
    },
    'FT': {
      nom: 'Fair Trade (Commerce Équitable)',
      description: 'Certification garantissant des conditions de commerce équitables',
      organisme: 'Fairtrade International',
      duree_validite: '3 ans',
      exigences: [
        'Prix minimum garanti pour les producteurs',
        'Prime de développement pour les communautés',
        'Interdiction du travail des enfants',
        'Conditions de travail sûres et équitables',
        'Liberté syndicale et droit à la négociation collective',
        'Égalité des genres et non-discrimination',
        'Pratiques commerciales transparentes'
      ],
      processus_validation: [
        'Adhésion à une organisation de producteurs reconnue',
        'Évaluation des pratiques sociales et économiques',
        'Vérification des systèmes de gouvernance démocratique',
        'Audit des conditions de travail et des salaires',
        'Évaluation des impacts sociaux et économiques',
        'Formation aux principes du commerce équitable',
        'Audits réguliers de conformité'
      ],
      documents_requis: [
        'Statuts et règlements de l\'organisation de producteurs',
        'Preuves de paiement des primes de développement',
        'Registres des membres et des bénéficiaires',
        'Contrats de travail et registres de paie',
        'Preuves de formations et de sensibilisations',
        'Plans d\'investissement des primes communautaires'
      ]
    },
    'UEBT': {
      nom: 'UEBT (Union for Ethical BioTrade)',
      description: 'Certification pour l\'approvisionnement éthique en biodiversité',
      organisme: 'Union for Ethical BioTrade',
      duree_validite: '2 ans',
      exigences: [
        'Respect des principes de l\'UEBT',
        'Conservation de la biodiversité',
        'Partage équitable des avantages',
        'Pratiques de récolte durables',
        'Respect des droits des communautés locales',
        'Transparence dans la chaîne d\'approvisionnement',
        'Amélioration continue des pratiques'
      ],
      processus_validation: [
        'Évaluation initiale des pratiques de récolte',
        'Vérification des relations avec les communautés locales',
        'Audit des systèmes de traçabilité',
        'Évaluation des impacts environnementaux',
        'Formation aux principes de l\'UEBT',
        'Mise en place de plans de gestion durable',
        'Audits périodiques de conformité'
      ],
      documents_requis: [
        'Accords avec les communautés locales',
        'Plans de gestion des ressources naturelles',
        'Registres de récolte et de production',
        'Preuves de partage des bénéfices',
        'Documents de traçabilité complète',
        'Évaluations d\'impact environnemental'
      ]
    },
    'BIO': {
      nom: 'Agriculture Biologique',
      description: 'Certification pour les produits issus de l\'agriculture biologique',
      organisme: 'Ecocert / AB',
      duree_validite: '1 an',
      exigences: [
        'Interdiction des pesticides et engrais chimiques',
        'Utilisation de méthodes naturelles de lutte contre les maladies',
        'Rotation des cultures pour maintenir la fertilité des sols',
        'Utilisation de semences biologiques',
        'Respect des cycles naturels des plantes',
        'Interdiction des OGM',
        'Gestion écologique des sols et de l\'eau'
      ],
      processus_validation: [
        'Période de conversion de 2-3 ans',
        'Inspection des parcelles et des pratiques',
        'Vérification des intrants utilisés',
        'Analyse des sols et de l\'eau',
        'Audit des systèmes de production',
        'Formation aux pratiques biologiques',
        'Contrôles annuels de conformité'
      ],
      documents_requis: [
        'Plans de rotation des cultures',
        'Registres des intrants utilisés',
        'Preuves d\'achat de semences biologiques',
        'Journal des pratiques culturales',
        'Analyses de sols et d\'eau',
        'Contrats avec les fournisseurs biologiques'
      ]
    },
    'G4G': {
      nom: 'Good4Good (G4G)',
      description: 'Certification pour les pratiques durables et responsables',
      organisme: 'Good4Good',
      duree_validite: '3 ans',
      exigences: [
        'Engagement envers le développement durable',
        'Responsabilité sociale et environnementale',
        'Transparence dans les opérations',
        'Amélioration continue des pratiques',
        'Respect des droits humains',
        'Réduction de l\'empreinte écologique',
        'Engagement communautaire'
      ],
      processus_validation: [
        'Auto-évaluation initiale',
        'Développement de plans d\'action durables',
        'Mise en œuvre des pratiques G4G',
        'Évaluation par des auditeurs indépendants',
        'Formation et sensibilisation',
        'Suivi et rapport des progrès',
        'Audits de renouvellement'
      ],
      documents_requis: [
        'Politique de durabilité',
        'Plans d\'action et rapports de progrès',
        'Preuves d\'engagement communautaire',
        'Documents de transparence financière',
        'Évaluations d\'impact social et environnemental',
        'Preuves de formation et de sensibilisation'
      ]
    },
    'FFL': {
      nom: 'For Life (FFL)',
      description: 'Certification pour la responsabilité sociale et environnementale',
      organisme: 'IMO (Institute for Marketecology)',
      duree_validite: '3 ans',
      exigences: [
        'Respect des normes sociales strictes',
        'Protection de l\'environnement',
        'Conditions de travail équitables',
        'Développement communautaire',
        'Transparence et traçabilité',
        'Amélioration continue',
        'Respect des droits humains'
      ],
      processus_validation: [
        'Évaluation initiale des pratiques',
        'Développement de plans de conformité',
        'Formation aux normes FFL',
        'Mise en œuvre des améliorations',
        'Audit par des organismes accrédités',
        'Suivi et rapport des progrès',
        'Audits de renouvellement réguliers'
      ],
      documents_requis: [
        'Politiques sociales et environnementales',
        'Registres des pratiques et améliorations',
        'Preuves de formation des travailleurs',
        'Documents de traçabilité complète',
        'Rapports d\'impact social et environnemental',
        'Preuves d\'engagement communautaire'
      ]
    },
    'PACT': {
      nom: 'PACT Madagascar',
      description: 'Certification pour la conservation et le développement durable à Madagascar',
      organisme: 'PACT',
      duree_validite: '2 ans',
      exigences: [
        'Protection des écosystèmes uniques de Madagascar',
        'Pratiques agricoles respectueuses de la biodiversité',
        'Engagement envers les communautés locales',
        'Conservation des ressources naturelles',
        'Développement durable des communautés',
        'Respect des traditions et cultures locales',
        'Gestion responsable des terres'
      ],
      processus_validation: [
        'Évaluation des impacts environnementaux',
        'Développement de plans de conservation',
        'Formation aux pratiques durables',
        'Mise en œuvre des plans de gestion',
        'Audit des pratiques agricoles',
        'Suivi des impacts sociaux et environnementaux',
        'Audits de conformité réguliers'
      ],
      documents_requis: [
        'Plans de conservation des écosystèmes',
        'Accords avec les communautés locales',
        'Registres des pratiques agricoles',
        'Preuves de formation et de sensibilisation',
        'Évaluations d\'impact environnemental',
        'Documents de gestion des ressources naturelles'
      ]
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <Icon name="ExclamationTriangleIcon" size="xl" className="text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-600 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button
            onClick={loadCertificationTypes}
            variant="primary"
            icon="ArrowPathIcon"
          >
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (selectedCertification) {
    const certCode = selectedCertification.code;
    const spec = certificationSpecifications[certCode] || {
      nom: selectedCertification.nom,
      description: selectedCertification.description,
      organisme: selectedCertification.organisme_certificateur,
      duree_validite: `${selectedCertification.duree_validite_ans} an(s)`,
      exigences: ['Les exigences spécifiques seront ajoutées prochainement'],
      processus_validation: ['Le processus de validation sera détaillé prochainement'],
      documents_requis: ['La liste des documents requis sera ajoutée prochainement']
    };

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <Icon name="ArrowLeftIcon" size="md" />
            <span>Retour à la liste</span>
          </button>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                <div className="w-24 h-24 bg-chick-yellow-100 rounded-full flex items-center justify-center">
                  <Icon name="CheckBadgeIcon" size="xl" className="text-chick-yellow" />
                </div>
              </div>

              <div className="flex-1">
                <h1 className="text-3xl font-bold text-dark mb-2">
                  {spec.nom} <span className="text-chick-yellow">({certCode})</span>
                </h1>
                <p className="text-gray-600 mb-4">{spec.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card padding="sm" className="text-center">
                    <p className="text-gray-600 text-sm mb-1">Organisme</p>
                    <p className="text-lg font-bold text-dark">{spec.organisme}</p>
                  </Card>
                  <Card padding="sm" className="text-center">
                    <p className="text-gray-600 text-sm mb-1">Durée de validité</p>
                    <p className="text-lg font-bold text-dark">{spec.duree_validite}</p>
                  </Card>
                  <Card padding="sm" className="text-center">
                    <p className="text-gray-600 text-sm mb-1">Niveau</p>
                    <p className="text-lg font-bold text-dark">{selectedCertification.niveau_display || selectedCertification.niveau}</p>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Exigences Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-dark flex items-center gap-2">
              <Icon name="ClipboardDocumentListIcon" size="md" className="text-gray-600" />
              Exigences de la certification
            </h2>
            <button
              onClick={() => toggleSection(selectedCertification.id, 'exigences')}
              className="text-chick-yellow hover:text-chick-yellow-600"
            >
              {expandedSections[`${selectedCertification.id}-exigences`] ? 'Masquer' : 'Voir tout'}
            </button>
          </div>

          <div className="space-y-3">
            {spec.exigences.slice(0, expandedSections[`${selectedCertification.id}-exigences`] ? spec.exigences.length : 5).map((exigence, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Icon name="CheckCircleIcon" size="sm" className="text-green-600 mt-1 flex-shrink-0" />
                <p className="text-gray-700">{exigence}</p>
              </div>
            ))}
            {spec.exigences.length > 5 && !expandedSections[`${selectedCertification.id}-exigences`] && (
              <p className="text-sm text-gray-500">... et {spec.exigences.length - 5} autres exigences</p>
            )}
          </div>
        </div>

        {/* Processus de Validation Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-dark flex items-center gap-2">
              <Icon name="ClipboardDocumentCheckIcon" size="md" className="text-gray-600" />
              Processus de validation
            </h2>
            <button
              onClick={() => toggleSection(selectedCertification.id, 'validation')}
              className="text-chick-yellow hover:text-chick-yellow-600"
            >
              {expandedSections[`${selectedCertification.id}-validation`] ? 'Masquer' : 'Voir tout'}
            </button>
          </div>

          <div className="space-y-4">
            {spec.processus_validation.slice(0, expandedSections[`${selectedCertification.id}-validation`] ? spec.processus_validation.length : 5).map((etape, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <p className="text-gray-700">{etape}</p>
              </div>
            ))}
            {spec.processus_validation.length > 5 && !expandedSections[`${selectedCertification.id}-validation`] && (
              <p className="text-sm text-gray-500">... et {spec.processus_validation.length - 5} autres étapes</p>
            )}
          </div>
        </div>

        {/* Documents Requis Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-dark flex items-center gap-2">
              <Icon name="DocumentTextIcon" size="md" className="text-gray-600" />
              Documents requis
            </h2>
            <button
              onClick={() => toggleSection(selectedCertification.id, 'documents')}
              className="text-chick-yellow hover:text-chick-yellow-600"
            >
              {expandedSections[`${selectedCertification.id}-documents`] ? 'Masquer' : 'Voir tout'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {spec.documents_requis.slice(0, expandedSections[`${selectedCertification.id}-documents`] ? spec.documents_requis.length : 6).map((document, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Icon name="DocumentIcon" size="sm" className="text-blue-600 mt-1 flex-shrink-0" />
                <p className="text-gray-700">{document}</p>
              </div>
            ))}
            {spec.documents_requis.length > 6 && !expandedSections[`${selectedCertification.id}-documents`] && (
              <p className="text-sm text-gray-500 col-span-1 md:col-span-2">... et {spec.documents_requis.length - 6} autres documents</p>
            )}
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-dark mb-4 flex items-center gap-2">
            <Icon name="InformationCircleIcon" size="md" className="text-gray-600" />
            Informations supplémentaires
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-dark mb-2">À propos de cette certification</h3>
              <p className="text-gray-600">
                {selectedCertification.description || 'Cette certification est reconnue internationalement et permet aux producteurs de démontrer leur engagement envers des pratiques agricoles durables et responsables.'}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-dark mb-2">Bénéfices pour les producteurs</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Accès à des marchés premium et internationaux</li>
                <li>Meilleures conditions commerciales et prix garantis</li>
                <li>Amélioration des pratiques agricoles et de la productivité</li>
                <li>Renforcement de la crédibilité et de la réputation</li>
                <li>Contribution à la protection de l'environnement</li>
                <li>Accès à des formations et un soutien technique</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-dark mb-2">
          Spécifications des <span className="text-chick-yellow">Certifications</span>
        </h1>
        <p className="text-gray-600">Découvrez les exigences et processus de validation pour chaque type de certification</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-chick-yellow mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des certifications...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificationTypes.length === 0 ? (
            <div className="text-center py-12 col-span-full">
              <p className="text-gray-500">Aucun type de certification disponible</p>
            </div>
          ) : (
            certificationTypes.map((certType) => {
              const spec = certificationSpecifications[certType.code] || {
                nom: certType.nom,
                description: certType.description,
                organisme: certType.organisme_certificateur,
                duree_validite: `${certType.duree_validite_ans} an(s)`
              };

              return (
                <Card
                  key={certType.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedCertification(certType)}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-chick-yellow-100 rounded-full flex items-center justify-center">
                          <Icon name="CheckBadgeIcon" size="md" className="text-chick-yellow" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-dark">{certType.nom}</h3>
                          <p className="text-sm text-gray-500">{certType.code}</p>
                        </div>
                      </div>
                      <Icon name="ChevronRightIcon" size="md" className="text-gray-400" />
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Icon name="BuildingOfficeIcon" size="sm" className="text-gray-500" />
                        <span className="text-gray-600">{spec.organisme}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Icon name="CalendarIcon" size="sm" className="text-gray-500" />
                        <span className="text-gray-600">Validité: {spec.duree_validite}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Icon name="InformationCircleIcon" size="sm" className="text-gray-500" />
                        <span className="text-gray-600">{certType.niveau_display || certType.niveau}</span>
                      </div>

                      <div className="pt-3">
                        <Badge variant="info" size="sm">
                          Voir les détails
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default CertificationSpecifications;