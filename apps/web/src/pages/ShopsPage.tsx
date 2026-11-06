import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  useCitiesQuery,
  useCreateShopMutation,
  useDeleteShopMutation,
  useDistrictsQuery,
  useOverviewQuery,
  useOwnerShopsQuery,
  useUpdateShopMutation,
} from '../store/apiSlice';
import { errorText } from '../store/baseQuery';
import type { Shop } from '../types';

const EMPTY_FORM = { ad: '', ilId: '', ilceId: '', adres: '', telefon: '' };

// İşletme sahibinin dükkanları. Plan dükkan limitine kadar yeni dükkan eklenebilir; her dükkan düzenlenebilir.
export default function ShopsPage() {
  const { t } = useTranslation();
  const shopsQ = useOwnerShopsQuery();
  const overviewQ = useOverviewQuery();
  const citiesQ = useCitiesQuery();
  const shops: Shop[] | null = shopsQ.data ?? null;
  const overview = overviewQ.data ?? null;
  const cities = citiesQ.data ?? [];

  const [form, setForm] = useState(EMPTY_FORM);
  const districtsQ = useDistrictsQuery(Number(form.ilId), { skip: !form.ilId });
  // Düzenlenen dükkan (null ise düzenleme formu kapalı).
  const [editing, setEditing] = useState<Shop | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const editDistrictsQ = useDistrictsQuery(Number(editForm.ilId), { skip: !editing || !editForm.ilId });

  const [createShop, createState] = useCreateShopMutation();
  const [updateShop] = useUpdateShopMutation();
  const [deleteShop] = useDeleteShopMutation();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const listError = shopsQ.error ? errorText(shopsQ.error, t('common.error')) : '';

  function onCityChange(id: string) {
    setForm((f) => ({ ...f, ilId: id, ilceId: '' }));
  }

  function startEdit(shop: Shop) {
    setError('');
    setMessage('');
    setEditing(shop);
    setEditForm({
      ad: shop.ad,
      ilId: String(shop.ilId),
      ilceId: String(shop.ilceId),
      adres: shop.adres ?? '',
      telefon: shop.telefon ?? '',
    });
  }

  function onEditCityChange(id: string) {
    setEditForm((f) => ({ ...f, ilId: id, ilceId: '' }));
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await createShop({
        ad: form.ad,
        ilId: Number(form.ilId),
        ilceId: Number(form.ilceId),
        ...(form.adres ? { adres: form.adres } : {}),
        ...(form.telefon ? { telefon: form.telefon } : {}),
      }).unwrap();
      setForm(EMPTY_FORM);
      setMessage(t('shops.created'));
    } catch (err) {
      setError(errorText(err, t('common.error')));
    }
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError('');
    setMessage('');
    try {
      await updateShop({
        id: editing.id,
        body: {
          ad: editForm.ad,
          ilId: Number(editForm.ilId),
          ilceId: Number(editForm.ilceId),
          adres: editForm.adres,
          telefon: editForm.telefon,
        },
      }).unwrap();
      setEditing(null);
      setMessage(t('shops.updated'));
    } catch (err) {
      setError(errorText(err, t('common.error')));
    }
  }

  async function toggle(shop: Shop) {
    setError('');
    setMessage('');
    try {
      await updateShop({ id: shop.id, body: { aktif: !shop.aktif } }).unwrap();
    } catch (err) {
      setError(errorText(err, t('common.error')));
    }
  }

  async function remove(shop: Shop) {
    if (!window.confirm(t('common.confirmDelete'))) return;
    setError('');
    setMessage('');
    try {
      await deleteShop(shop.id).unwrap();
      if (editing?.id === shop.id) setEditing(null);
    } catch (err) {
      setError(errorText(err, t('common.error')));
    }
  }

  const limitReached = overview !== null && shops !== null && overview.maxDukkan !== null && shops.length >= overview.maxDukkan;

  // Düzenleme ve yeni dükkan formunda aynı alanlar.
  const shopFields = (
    values: typeof EMPTY_FORM,
    onField: (patch: Partial<typeof EMPTY_FORM>) => void,
    onCity: (id: string) => void,
    districtList: { id: number; ad: string }[],
    idPrefix: string,
  ) => (
    <div className="row g-2">
      <div className="col-md-4"><label className="form-label small" htmlFor={`${idPrefix}-ad`}>{t('shops.name')}</label><input id={`${idPrefix}-ad`} className="form-control" required value={values.ad} onChange={(e) => onField({ ad: e.target.value })} /></div>
      <div className="col-md-4">
        <label className="form-label small" htmlFor={`${idPrefix}-il`}>{t('register.city')}</label>
        <select id={`${idPrefix}-il`} className="form-select" required value={values.ilId} onChange={(e) => onCity(e.target.value)}>
          <option value="">{t('register.choose')}</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.ad}</option>)}
        </select>
      </div>
      <div className="col-md-4">
        <label className="form-label small" htmlFor={`${idPrefix}-ilce`}>{t('register.district')}</label>
        <select id={`${idPrefix}-ilce`} className="form-select" required value={values.ilceId} onChange={(e) => onField({ ilceId: e.target.value })} disabled={!values.ilId}>
          <option value="">{t('register.choose')}</option>
          {districtList.map((d) => <option key={d.id} value={d.id}>{d.ad}</option>)}
        </select>
      </div>
      <div className="col-md-6"><label className="form-label small" htmlFor={`${idPrefix}-adres`}>{t('register.address')}</label><input id={`${idPrefix}-adres`} className="form-control" value={values.adres} onChange={(e) => onField({ adres: e.target.value })} /></div>
      <div className="col-md-4"><label className="form-label small" htmlFor={`${idPrefix}-tel`}>{t('register.shopPhone')}</label><input id={`${idPrefix}-tel`} className="form-control" value={values.telefon} onChange={(e) => onField({ telefon: e.target.value })} /></div>
    </div>
  );

  return (
    <div className="vstack gap-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <h1 className="h3 page-title mb-0">{t('shops.title')}</h1>
        {overview && (
          <span className="small text-secondary">
            {t('shops.plan')}: <strong>{overview.planAd}</strong> · {t('shops.limit')}: {overview.maxDukkan ?? t('shops.unlimited')}
          </span>
        )}
      </div>

      {(error || listError) && <div className="alert alert-danger mb-0">{error || listError}</div>}
      {message && <div className="alert alert-success mb-0">{message}</div>}

      {editing && (
        <form onSubmit={saveEdit} className="card shadow-sm border-0 border-start border-primary border-4">
          <div className="card-body vstack gap-3">
            <h2 className="h6 fw-semibold mb-0">{t('shops.edit')}</h2>
            {shopFields(editForm, (p) => setEditForm((f) => ({ ...f, ...p })), onEditCityChange, editDistrictsQ.data ?? [], 'shop-edit')}
            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setEditing(null)}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary">{t('common.save')}</button>
            </div>
          </div>
        </form>
      )}

      <form onSubmit={create} className="card shadow-sm border-0">
        <div className="card-body vstack gap-3">
          <h2 className="h6 fw-semibold mb-0">{t('shops.new')}</h2>
          {limitReached && <div className="alert alert-warning mb-0">{t('shops.limitReached')}</div>}
          {shopFields(form, (p) => setForm((f) => ({ ...f, ...p })), onCityChange, districtsQ.data ?? [], 'shop-new')}
          <div className="d-flex justify-content-end">
            <button type="submit" className="btn btn-primary" disabled={limitReached || createState.isLoading}>{t('common.add')}</button>
          </div>
        </div>
      </form>

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {shops === null ? (
            <p className="p-4 text-secondary mb-0">{t('common.loading')}</p>
          ) : shops.length === 0 ? (
            <p className="p-4 text-secondary mb-0">{t('common.empty')}</p>
          ) : (
            <>
              <div className="d-md-none">
                {shops.map((s) => (
                  <div key={s.id} className="p-3 border-bottom">
                    <div className="d-flex justify-content-between">
                      <span className="fw-semibold">{s.ad}</span>
                      <span className={`badge ${s.aktif ? 'text-bg-success' : 'text-bg-secondary'}`}>{s.aktif ? t('common.active') : t('common.passive')}</span>
                    </div>
                    <div className="small text-secondary">{s.ilAd} / {s.ilceAd} · {s.kuaforSayisi} {t('shops.stylistCount')}</div>
                    <div className="row g-2 mt-2">
                      <div className="col-4"><button className="btn btn-sm btn-outline-primary w-100" onClick={() => startEdit(s)}>{t('common.edit')}</button></div>
                      <div className="col-4"><button className="btn btn-sm btn-outline-secondary w-100" onClick={() => toggle(s)}>{s.aktif ? t('common.passivate') : t('common.activate')}</button></div>
                      <div className="col-4"><button className="btn btn-sm btn-outline-danger w-100" onClick={() => remove(s)}>{t('common.delete')}</button></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="d-none d-md-block">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr><th>{t('shops.name')}</th><th>{t('shops.location')}</th><th>{t('shops.address')}</th><th>{t('stylists.title')}</th><th>{t('common.status')}</th><th className="text-end">{t('appointments.actions')}</th></tr>
                  </thead>
                  <tbody>
                    {shops.map((s) => (
                      <tr key={s.id}>
                        <td className="fw-semibold">{s.ad}</td>
                        <td>{s.ilAd} / {s.ilceAd}</td>
                        <td className="small">{s.adres ?? '-'}</td>
                        <td>{s.kuaforSayisi}</td>
                        <td><span className={`badge ${s.aktif ? 'text-bg-success' : 'text-bg-secondary'}`}>{s.aktif ? t('common.active') : t('common.passive')}</span></td>
                        <td className="text-end">
                          <button className="btn btn-sm btn-outline-primary me-1" onClick={() => startEdit(s)}>{t('common.edit')}</button>
                          <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => toggle(s)}>{s.aktif ? t('common.passivate') : t('common.activate')}</button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => remove(s)}>{t('common.delete')}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
      <p className="small text-secondary mb-0">
        <Link to="/kuaforler">{t('shops.goStylists')}</Link>
      </p>
    </div>
  );
}
