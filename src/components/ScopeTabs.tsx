export function ScopeTabs() {
    return (
        <>
            <div className="scope-tabs" id="scope-tabs">
                <button className="scope-btn active" id="scope-cookies-btn" type="button">
                    <i className="fas fa-cookie-bite" aria-hidden="true" />
                    Cookies
                </button>
                <button className="scope-btn" id="scope-localstorage-btn" type="button">
                    <i className="fas fa-database" aria-hidden="true" />
                    Storage
                </button>
                <button className="scope-btn" id="scope-sessionstorage-btn" type="button">
                    <i className="fas fa-clock" aria-hidden="true" />
                    Session
                </button>
            </div>
            <div className="tabs">
                <button className="tab-btn active" id="current-domain-tab" type="button">
                    <i className="fas fa-at" aria-hidden="true" />
                    Current Domain
                </button>
                <button className="tab-btn" id="all-domains-tab" type="button">
                    <i className="fas fa-globe" aria-hidden="true" />
                    All Domains
                </button>
            </div>
        </>
    );
}
