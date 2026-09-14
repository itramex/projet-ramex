import { memo } from 'react';
// Imports explicites (et non `import *`) pour activer le tree-shaking :
// seules les ~50 icônes réellement utilisées par l'application sont
// embarquées dans le bundle (sinon toutes les ~580 icônes heroicons
// sont incluses, soit ~500 kB supplémentaires).
import {
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowRightOnRectangleIcon,
  ArrowUpTrayIcon,
  Bars3Icon,
  BookOpenIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ChartBarIcon,
  ChartBarSquareIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  AcademicCapIcon,
  ArrowLeftIcon,
  PaperClipIcon,
  Cog6ToothIcon,
  CogIcon,
  CubeIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  FunnelIcon,
  GiftIcon,
  GlobeAltIcon,
  HeartIcon,
  HomeIcon,
  InboxIcon,
  InformationCircleIcon,
  LightBulbIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  MapIcon,
  MapPinIcon,
  MegaphoneIcon,
  PaperAirplaneIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  RectangleGroupIcon,
  RectangleStackIcon,
  SparklesIcon,
  Square3Stack3DIcon,
  TrashIcon,
  TruckIcon,
  UserGroupIcon,
  UserIcon,
  UsersIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  ArchiveBoxIcon as ArchiveBoxIconSolid,
  ArrowDownTrayIcon as ArrowDownTrayIconSolid,
  ArrowPathIcon as ArrowPathIconSolid,
  ArrowRightOnRectangleIcon as ArrowRightOnRectangleIconSolid,
  ArrowUpTrayIcon as ArrowUpTrayIconSolid,
  Bars3Icon as Bars3IconSolid,
  BookOpenIcon as BookOpenIconSolid,
  BuildingOfficeIcon as BuildingOfficeIconSolid,
  CalendarIcon as CalendarIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  ChartBarSquareIcon as ChartBarSquareIconSolid,
  CheckBadgeIcon as CheckBadgeIconSolid,
  CheckCircleIcon as CheckCircleIconSolid,
  CheckIcon as CheckIconSolid,
  ChevronDownIcon as ChevronDownIconSolid,
  ChevronRightIcon as ChevronRightIconSolid,
  ClipboardDocumentListIcon as ClipboardDocumentListIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  CogIcon as CogIconSolid,
  CubeIcon as CubeIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  EnvelopeIcon as EnvelopeIconSolid,
  ExclamationTriangleIcon as ExclamationTriangleIconSolid,
  EyeIcon as EyeIconSolid,
  FunnelIcon as FunnelIconSolid,
  GiftIcon as GiftIconSolid,
  GlobeAltIcon as GlobeAltIconSolid,
  HeartIcon as HeartIconSolid,
  HomeIcon as HomeIconSolid,
  InboxIcon as InboxIconSolid,
  InformationCircleIcon as InformationCircleIconSolid,
  LightBulbIcon as LightBulbIconSolid,
  LinkIcon as LinkIconSolid,
  MagnifyingGlassIcon as MagnifyingGlassIconSolid,
  MapIcon as MapIconSolid,
  MapPinIcon as MapPinIconSolid,
  MegaphoneIcon as MegaphoneIconSolid,
  PencilIcon as PencilIconSolid,
  PhoneIcon as PhoneIconSolid,
  PlusIcon as PlusIconSolid,
  RectangleGroupIcon as RectangleGroupIconSolid,
  RectangleStackIcon as RectangleStackIconSolid,
  SparklesIcon as SparklesIconSolid,
  Square3Stack3DIcon as Square3Stack3DIconSolid,
  TrashIcon as TrashIconSolid,
  TruckIcon as TruckIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  UserIcon as UserIconSolid,
  UsersIcon as UsersIconSolid,
  XCircleIcon as XCircleIconSolid,
  XMarkIcon as XMarkIconSolid,
} from '@heroicons/react/24/solid';

// Accès dynamique par nom d'icône : <Icon name="UsersIcon" variant="outline|solid" />
const icons = { AcademicCapIcon, ArchiveBoxIcon, ArrowDownTrayIcon, ArrowLeftIcon, ArrowPathIcon, ArrowRightOnRectangleIcon, ArrowUpTrayIcon, Bars3Icon, BookOpenIcon, BuildingOfficeIcon, CalendarIcon, ChartBarIcon, ChartBarSquareIcon, CheckBadgeIcon, CheckCircleIcon, CheckIcon, ChevronDownIcon, ChevronRightIcon, ClipboardDocumentCheckIcon, ClipboardDocumentListIcon, Cog6ToothIcon, CogIcon, CubeIcon, DocumentTextIcon, EnvelopeIcon, ExclamationTriangleIcon, EyeIcon, FunnelIcon, GiftIcon, GlobeAltIcon, HeartIcon, HomeIcon, InboxIcon, InformationCircleIcon, LightBulbIcon, LinkIcon, MagnifyingGlassIcon, MapIcon, MapPinIcon, MegaphoneIcon, PaperAirplaneIcon, PaperClipIcon, PencilIcon, PhoneIcon, PlusIcon, RectangleGroupIcon, RectangleStackIcon, SparklesIcon, Square3Stack3DIcon, TrashIcon, TruckIcon, UserGroupIcon, UserIcon, UsersIcon, XCircleIcon, XMarkIcon };

const iconsSolid = { ArchiveBoxIcon: ArchiveBoxIconSolid, ArrowDownTrayIcon: ArrowDownTrayIconSolid, ArrowPathIcon: ArrowPathIconSolid, ArrowRightOnRectangleIcon: ArrowRightOnRectangleIconSolid, ArrowUpTrayIcon: ArrowUpTrayIconSolid, Bars3Icon: Bars3IconSolid, BookOpenIcon: BookOpenIconSolid, BuildingOfficeIcon: BuildingOfficeIconSolid, CalendarIcon: CalendarIconSolid, ChartBarIcon: ChartBarIconSolid, ChartBarSquareIcon: ChartBarSquareIconSolid, CheckBadgeIcon: CheckBadgeIconSolid, CheckCircleIcon: CheckCircleIconSolid, CheckIcon: CheckIconSolid, ChevronDownIcon: ChevronDownIconSolid, ChevronRightIcon: ChevronRightIconSolid, ClipboardDocumentListIcon: ClipboardDocumentListIconSolid, Cog6ToothIcon: Cog6ToothIconSolid, CogIcon: CogIconSolid, CubeIcon: CubeIconSolid, DocumentTextIcon: DocumentTextIconSolid, EnvelopeIcon: EnvelopeIconSolid, ExclamationTriangleIcon: ExclamationTriangleIconSolid, EyeIcon: EyeIconSolid, FunnelIcon: FunnelIconSolid, GiftIcon: GiftIconSolid, GlobeAltIcon: GlobeAltIconSolid, HeartIcon: HeartIconSolid, HomeIcon: HomeIconSolid, InboxIcon: InboxIconSolid, InformationCircleIcon: InformationCircleIconSolid, LightBulbIcon: LightBulbIconSolid, LinkIcon: LinkIconSolid, MagnifyingGlassIcon: MagnifyingGlassIconSolid, MapIcon: MapIconSolid, MapPinIcon: MapPinIconSolid, MegaphoneIcon: MegaphoneIconSolid, PencilIcon: PencilIconSolid, PhoneIcon: PhoneIconSolid, PlusIcon: PlusIconSolid, RectangleGroupIcon: RectangleGroupIconSolid, RectangleStackIcon: RectangleStackIconSolid, SparklesIcon: SparklesIconSolid, Square3Stack3DIcon: Square3Stack3DIconSolid, TrashIcon: TrashIconSolid, TruckIcon: TruckIconSolid, UserGroupIcon: UserGroupIconSolid, UserIcon: UserIconSolid, UsersIcon: UsersIconSolid, XCircleIcon: XCircleIconSolid, XMarkIcon: XMarkIconSolid };


const Icon = memo(({ 
  name,           // Nom de l'icône (ex: 'ChartBarIcon')
  variant = 'outline',  // 'outline' ou 'solid'
  size = 'md',    // 'sm' (16px), 'md' (20px), 'lg' (24px), 'xl' (32px)
  className = '',
  ...props 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  const IconComponent = variant === 'solid' 
    ? iconsSolid[name] 
    : icons[name];

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  return (
    <IconComponent 
      className={`${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
});

Icon.displayName = 'Icon';

export default Icon;
