import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SchedulePage from './SchedulePage';

// İşletme sahibi, kuaförün çalışma saatlerini ve izinlerini bu sayfadan yönetir.
export default function OwnerSchedulePage() {
  const { t } = useTranslation();
  const { id } = useParams();
  return (
    <div>
      <Link to={`/kuaforler/${id}`} className="small">{t('stylists.back')}</Link>
      <SchedulePage basePath={`/business/stylists/${id}`} />
    </div>
  );
}
