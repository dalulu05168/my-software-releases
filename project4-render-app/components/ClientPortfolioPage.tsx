import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { project4ClientApi } from "../helpers/project4ClientApi";
import type { CoreWorkflowView } from "./CoreWorkflowPages";
import styles from "./CoreWorkflowPages.module.css";

const translations: Record<string, string> = {
  DEPOSIT: "Depunere",
  WITHDRAWAL: "Retragere",
  BUY: "Cumpărare",
  SELL: "Vânzare",
  PENDING: "În verificare",
  APPROVED: "Aprobat",
  REJECTED: "Respins",
  FILLED: "Executat",
  SETTLED: "Decontat",
  CANCELLED: "Anulat",
  COMPLETED: "Finalizat",
};
function label(value: string | null | undefined) {
  return value == null ? "—" : translations[value] || value;
}
function asText(value: number | string | null | undefined) {
  return value == null ? "—" : String(value);
}
function date(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString("ro-RO") : "—";
}

export function ClientPortfolioPage({ view }: { view: CoreWorkflowView }) {
  const query = useQuery({
    queryKey: ["project4-client-portfolio"],
    queryFn: project4ClientApi.listPortfolio,
    staleTime: 5_000,
    retry: false,
  });
  const securitiesById = useMemo(
    () => new Map((query.data?.securities || []).map((item) => [item.id, item])),
    [query.data?.securities],
  );

  if (view === "settings") {
    return <section className={styles.stack} role="status">
      <h1>Setări cont</h1>
      <p>Modificarea parolei și a datelor bancare necesită verificare securizată în backend; nu este încă disponibilă.</p>
    </section>;
  }

  return (
    <div className={styles.stack}>
      <div className={styles.header}>
        <div>
          <h1>{view === "orders" ? "Ordinele mele" : view === "cash" ? "Fonduri" : "Pozițiile mele"}</h1>
          <p>Doar date verificate ale contului autentificat. Nicio operațiune financiară nu poate fi trimisă din acest ecran.</p>
        </div>
        <button type="button" className={styles.secondary} onClick={() => void query.refetch()} disabled={query.isFetching}>
          {query.isFetching ? "Se actualizează…" : "Actualizează"}
        </button>
      </div>
      {query.isLoading ? <p role="status">Se încarcă datele contului…</p> : null}
      {query.isError ? <p role="alert">Datele nu au putut fi verificate. Sesiunea poate fi expirată sau serviciul nu este disponibil. Nu afișăm date de demonstrație.</p> : null}
      {query.data?.readOnly ? <p role="status">Mod consultare. Soldurile nu sunt încă calculate din registrul contabil.</p> : null}
      {query.data && view === "orders" ? (
        <section className={styles.tablePanel}>
          <table>
            <thead><tr><th>Nr. ordin</th><th>Instrument</th><th>Direcție</th><th>Cantitate</th><th>Preț de referință</th><th>Monedă</th><th>Stare</th><th>Data</th></tr></thead>
            <tbody>{query.data.orders.map((order) => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>{order.security_id ? securitiesById.get(order.security_id)?.symbol || "—" : order.product_id || "—"}</td>
                <td>{label(order.side)}</td><td>{asText(order.quantity)}</td>
                <td>{asText(order.reference_price)}</td><td>{order.currency}</td>
                <td>{label(order.state)}</td><td>{date(order.created_at)}</td>
              </tr>
            ))}</tbody>
          </table>
          {!query.data.orders.length ? <p role="status">Nu există ordine pentru acest cont.</p> : null}
        </section>
      ) : null}
      {query.data && view === "cash" ? (
        <>
          <p role="status">Sold disponibil: neconectat. Nicio sumă nu este estimată.</p>
          <section className={styles.tablePanel}>
            <table>
              <thead><tr><th>Nr. cerere</th><th>Tip</th><th>Monedă</th><th>Sumă</th><th>Stare</th><th>Data</th></tr></thead>
              <tbody>{query.data.cashRequests.map((item) => (
                <tr key={item.id}><td>{item.id}</td><td>{label(item.type)}</td><td>{item.currency}</td>
                  <td>{asText(item.amount)}</td><td>{label(item.status)}</td><td>{date(item.created_at)}</td></tr>
              ))}</tbody>
            </table>
            {!query.data.cashRequests.length ? <p role="status">Nu există solicitări pentru acest cont.</p> : null}
          </section>
        </>
      ) : null}
      {query.data && view === "positions" ? (
        <section className={styles.tablePanel}>
          <table>
            <thead><tr><th>Simbol</th><th>Denumire</th><th>Cantitate</th><th>Cost mediu</th><th>Monedă</th><th>Ultima actualizare</th></tr></thead>
            <tbody>{query.data.positions.map((item) => (
              <tr key={item.security_id}><td>{securitiesById.get(item.security_id)?.symbol || "—"}</td>
                <td>{securitiesById.get(item.security_id)?.name || "—"}</td>
                <td>{asText(item.quantity)}</td><td>{asText(item.average_cost)}</td>
                <td>{item.currency}</td><td>{date(item.updated_at)}</td></tr>
            ))}</tbody>
          </table>
          {!query.data.positions.length ? <p role="status">Nu există poziții în acest cont.</p> : null}
        </section>
      ) : null}
    </div>
  );
}
