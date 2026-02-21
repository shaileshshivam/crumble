export function CookieListPanel() {
    return (
        <>
            <div className="info-bar" id="info-bar">
                <div>
                    <span id="info-title">Loading...</span>
                    <span id="cookie-count">(0 cookies)</span>
                </div>
                <div id="search-results-info" />
            </div>

            <div className="tab-content active" id="current-domain-content">
                <div className="pagination" id="current-domain-pagination">
                    <button id="current-prev-page" className="page-btn" aria-label="Previous page" type="button">
                        « Prev
                    </button>
                    <span id="current-page-info" className="page-info">
                        Page 1 of 1
                    </span>
                    <button id="current-next-page" className="page-btn" aria-label="Next page" type="button">
                        Next »
                    </button>
                </div>
                <div className="cookies-container" id="current-domain-cookies">
                    <div className="loading">Loading cookies...</div>
                </div>
            </div>

            <div className="tab-content" id="all-domains-content">
                <div className="pagination" id="all-domains-pagination">
                    <button id="all-prev-page" className="page-btn" aria-label="Previous page" type="button">
                        ‹
                    </button>
                    <span id="all-page-info" className="page-info">
                        Page 1 of 1
                    </span>
                    <button id="all-next-page" className="page-btn" aria-label="Next page" type="button">
                        ›
                    </button>
                </div>
                <div className="cookies-container" id="all-domains-cookies">
                    <div className="loading">Loading cookies...</div>
                </div>
            </div>
        </>
    );
}
