import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchGovernmentClients, GovernmentClient } from '../api/governmentClients';
import { getPortalDisplay } from '../config/portalDisplay';
import { ApiError } from '../api/client';
import { LoadingBlock, ErrorBanner, InfoBanner } from '../components/Feedback';

export default function PortalsPage() {
  const [clients, setClients] = useState<GovernmentClient[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGovernmentClients()
      .then((res) => setClients(res.entries))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load government portals.'));
  }, []);

  if (error) return <ErrorBanner message={error} />;
  if (!clients) return <LoadingBlock label="Loading government portals…" />;

  return (
    <div>
      <h1>Government Portals</h1>
      <p>
        Each portal below can request consent-based access to specific parts of your OTR profile — it does not
        receive your whole profile, and OTR does not fill in the portal's form for you.
      </p>

      <InfoBanner>
        This list is served live from OTR's registered government clients (<code>/api/government-clients</code>).
        Every field a portal can ever ask for is fixed here, server-side — a portal can't widen its own request at
        runtime.
      </InfoBanner>

      <div className="grid-2" style={{ rowGap: '1rem', marginTop: '1rem' }}>
        {clients.map((client) => {
          const display = getPortalDisplay(client.clientId);
          return (
            <div key={client.clientId} className="card">
              <h2>{client.name}</h2>
              <p style={{ fontSize: '0.88rem' }}>{client.organisation}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--neutral)' }}>
                Fields this portal may request:{' '}
                <code>
                  {client.allowedScopes
                    .slice(0, 2)
                    .map((f) => display?.fieldLabels[f] ?? f)
                    .join(', ')}
                  …
                </code>
              </p>
              <Link to={`/portals/${client.clientId}/consent`} className="btn btn-primary">
                Continue with OTR on {client.name}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
