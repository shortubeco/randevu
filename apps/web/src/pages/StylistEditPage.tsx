import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  useCreateServiceMutation,
  useDeleteServiceMutation,
  useDeleteStylistMutation,
  useOwnerStylistQuery,
  useStylistReviewsQuery,
  useStylistServicesQuery,
  useUpdateServiceMutation,
  useUpdateStylistMutation,
} from '../store/apiSlice';
import { errorText } from '../store/baseQuery';

// Kuaför düzenleme: bilgiler, hizmetler ve değerlendirmeler. Çalışma saatleri ayrı sayfada.
export default function StylistEditPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const stylistId = Number(id);

  const stylistQ = useOwnerStylistQuery(stylistId);
  const servicesQ = useStylistServicesQuery(stylistId);
  const reviewsQ = useStylistReviewsQuery(stylistId);
  const stylist = stylistQ.data ?? null;
  const services = servicesQ.data ?? [];
  const reviews = reviewsQ.data ?? null;

  const [updateStylist] = useUpdateStylistMutation();
  const [deleteStylist] = useDeleteStylistMutation();
  const [createService] = useCreateServiceMutation();
  const [updateService] = useUpdateServiceMutation();
  const [deleteService] = useDeleteServiceMutation();

  const [form, setForm] = useState({ ad: '', soyad: '', telefon: '', email: '', bio: '', slotDakika: '30', aktif: true, password: '' });
  const [svc, setSvc] = useState({ ad: '', sureDk: '30', fiyat: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Form, sunucudan gelen kayıtla doldurulur (yalnızca ilk yüklemede ve kayıt değişince).
  useEffect(() => {
    if (!stylist) return;
    setForm({
      ad: stylist.ad, soyad: stylist.soyad, telefon: stylist.telefon, email: stylist.email, bio: stylist.bio ?? '',
      slotDakika: String(stylist.slotDakika), aktif: stylist.aktif, password: '',
    });
  }, [stylist]);

  const loadError = stylistQ.error ? errorText(stylistQ.error, t('common.error')) : '';

  async function save(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await updateStylist({
        id: stylistId,
        body: {
          ad: form.ad,
          soyad: form.soyad,
          telefon: form.telefon,
          email: form.email,
          bio: form.bio,
          slotDakika: Number(form.slotDakika),
          aktif: form.aktif,
          ...(form.password ? { password: form.password } : {}),
        },
      }).unwrap();
      setMessage(form.password ? t('stylists.savedWithPassword') : t('stylists.saved'));
    } catch (err) {
      setError(errorText(err, t('common.error')));
    }
  }

  async function remove() {
    if (!window.confirm(t('stylists.confirmRemove'))) return;
    setError('');
    try {
      await deleteStylist(stylistId).unwrap();
      navigate('/kuaforler');
    } catch (err) {
      setError(errorText(err, t('common.error')));
    }
  }

  async function addService(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createService({ stylistId, body: { ad: svc.ad, sureDk: Number(svc.sureDk), fiyat: Number(svc.fiyat) } }).unwrap();
      setSvc({ ad: '', sureDk: '30', fiyat: '' });
    } catch (err) {
      setError(errorText(err, t('common.error')));
    }
  }

  async function toggleService(s: { id: number; aktif: boolean }) {
    setError('');
    try {
      await updateService({ id: s.id, stylistId, body: { aktif: !s.aktif } }).unwrap();
    } catch (err) {
      setError(errorText(err, t('common.error')));
    }
  }

  async function removeService(s: { id: number }) {
    if (!window.confirm(t('common.confirmDelete'))) return;
    setError('');
    try {
      await deleteService({ id: s.id, stylistId }).unwrap();
    } catch (err) {
      setError(errorText(err, t('common.error')));
    }
  }

  if (!stylist && !loadError) return <p className="text-secondary">{t('common.loading')}</p>;

  return (
    <div className="vstack gap-4" style={{ maxWidth: 960 }}>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>
          <Link to="/kuaforler" className="small">{t('stylists.back')}</Link>
          <h1 className="h3 page-title mb-0">{stylist ? `${stylist.ad} ${stylist.soyad}` : t('common.error')}</h1>
        </div>
        <Link to={`/kuaforler/${stylistId}/calisma`} className="btn btn-outline-primary">
          <i className="bi bi-clock-history me-1" aria-hidden="true" />{t('stylists.schedule')}
        </Link>
      </div>

      {(error || loadError) && <div className="alert alert-danger mb-0">{error || loadError}</div>}
      {message && <div className="alert alert-success mb-0">{message}</div>}

      {stylist && (
        <form onSubmit={save} className="card shadow-sm border-0">
          <div className="card-body">
            <h2 className="h6 fw-semibold mb-3">{t('stylists.info')}</h2>
            <div className="row g-2">
              <div className="col-md-3"><label className="form-label small" htmlFor="e-ad">{t('stylists.name')}</label><input id="e-ad" className="form-control" required value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} /></div>
              <div className="col-md-3"><label className="form-label small" htmlFor="e-soyad">{t('stylists.surname')}</label><input id="e-soyad" className="form-control" required value={form.soyad} onChange={(e) => setForm({ ...form, soyad: e.target.value })} /></div>
              <div className="col-md-3"><label className="form-label small" htmlFor="e-tel">{t('stylists.phone')}</label><input id="e-tel" className="form-control" required value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} /></div>
              <div className="col-md-3"><label className="form-label small" htmlFor="e-mail">{t('stylists.email')}</label><input id="e-mail" type="email" className="form-control" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="col-md-8"><label className="form-label small" htmlFor="e-bio">{t('stylists.bio')}</label><input id="e-bio" className="form-control" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
              <div className="col-md-2"><label className="form-label small" htmlFor="e-slot">{t('stylists.slot')}</label><input id="e-slot" type="number" min={15} max={120} className="form-control" value={form.slotDakika} onChange={(e) => setForm({ ...form, slotDakika: e.target.value })} /></div>
              <div className="col-md-2 d-flex align-items-end">
                <div className="form-check form-switch">
                  <input id="e-aktif" className="form-check-input" type="checkbox" checked={form.aktif} onChange={(e) => setForm({ ...form, aktif: e.target.checked })} />
                  <label className="form-check-label" htmlFor="e-aktif">{t('common.active')}</label>
                </div>
              </div>
              <div className="col-md-6"><label className="form-label small" htmlFor="e-pw">{t('stylists.newTempPassword')}</label><input id="e-pw" className="form-control" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" /></div>
              <div className="col-md-6 d-flex align-items-end"><p className="small text-secondary mb-0">{t('stylists.passwordHint')}</p></div>
            </div>
            <div className="d-flex justify-content-between mt-3">
              <button type="button" className="btn btn-outline-danger" onClick={remove}>{t('common.delete')}</button>
              <button type="submit" className="btn btn-primary">{t('common.save')}</button>
            </div>
          </div>
        </form>
      )}

      <section className="card shadow-sm border-0">
        <div className="card-body">
          <h2 className="h6 fw-semibold mb-3">{t('stylists.services')}</h2>
          <form onSubmit={addService} className="row g-2 align-items-end mb-3">
            <div className="col-md-5"><label className="form-label small" htmlFor="s-ad">{t('services.name')}</label><input id="s-ad" className="form-control" required value={svc.ad} onChange={(e) => setSvc({ ...svc, ad: e.target.value })} /></div>
            <div className="col-md-2"><label className="form-label small" htmlFor="s-sure">{t('services.duration')}</label><input id="s-sure" type="number" min={5} max={480} className="form-control" required value={svc.sureDk} onChange={(e) => setSvc({ ...svc, sureDk: e.target.value })} /></div>
            <div className="col-md-3"><label className="form-label small" htmlFor="s-fiyat">{t('services.price')}</label><input id="s-fiyat" type="number" min={0} step="0.01" className="form-control" required value={svc.fiyat} onChange={(e) => setSvc({ ...svc, fiyat: e.target.value })} /></div>
            <div className="col-md-2"><button type="submit" className="btn btn-primary w-100">{t('common.add')}</button></div>
          </form>
          {services.length === 0 ? (
            <p className="text-secondary mb-0">{t('common.empty')}</p>
          ) : (
            <ul className="list-group list-group-flush">
              {services.map((s) => (
                <li key={s.id} className="list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2 px-0">
                  <span>
                    <span className={s.aktif ? 'fw-semibold' : 'text-secondary text-decoration-line-through'}>{s.ad}</span>
                    <span className="small text-secondary"> · {s.sureDk} {t('services.minutes')} · {Number(s.fiyat).toLocaleString('tr-TR')} ₺</span>
                  </span>
                  <span className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => toggleService(s)}>{s.aktif ? t('common.passivate') : t('common.activate')}</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => removeService(s)}>{t('common.delete')}</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card shadow-sm border-0">
        <div className="card-body">
          <h2 className="h6 fw-semibold mb-2">{t('stylists.reviews')}</h2>
          {reviews === null ? (
            <p className="text-secondary mb-0">{t('common.loading')}</p>
          ) : reviews.adet === 0 ? (
            <p className="text-secondary mb-0">{t('stylists.noReviews')}</p>
          ) : (
            <>
              <p className="mb-2">
                <strong>{reviews.ortalama?.toFixed(1)}</strong> / 5 · {reviews.adet} {t('stylists.reviewCount')}
              </p>
              <ul className="list-unstyled vstack gap-2 mb-0">
                {reviews.yorumlar.map((y) => (
                  <li key={y.id} className="border-bottom pb-2">
                    <span className="text-warning">{'★'.repeat(y.puan)}</span>
                    <span className="text-secondary">{'☆'.repeat(5 - y.puan)}</span>
                    <span className="small text-secondary"> · {y.musteri}</span>
                    {y.yorum && <div>{y.yorum}</div>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
