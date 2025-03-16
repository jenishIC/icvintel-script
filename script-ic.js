var EventTracker;

// Event Tracking SDK
class EventTrackerClass {
    constructor(options = {}) {
        // Get tenant ID from script tag
        const scriptTag = document.querySelector('script[id="identify"]');
        const tenantId = scriptTag?.getAttribute('data-tenant-id');
        if (!tenantId) {
            throw new Error('data-tenant-id attribute is required in script tag');
        }
        this.apiUrl = 'https://app.icustomer.ai/api_v3/eventTracking';
        this.tenantId = tenantId;
        this.sessionId = null;
        this.identity = null;
        this.visitorData = null;
        this.initialize();
    }

    async initialize() {
        try {
            // Initialize FingerprintJS Pro
            const FingerprintJS = await import('https://fpjscdn.net/v3/kYVarTYjAJjBfUp2CjzW');

            // Get visitor data
            const fp = await FingerprintJS.load();
            this.visitorData = await fp.get({
                extendedResult: true
            });
            console.log("VISITOR => ", this.visitorData)


            // Initialize session with visitor data
            const response = await fetch(`${this.apiUrl}/init`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    requestId: this.visitorData.requestId,
                    visitorId: this.visitorData.visitorId,
                    tenantId: this.tenantId
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to initialize tracking');
            }
            
            const data = await response.json();
            this.sessionId = data.sessionId;
            this.identity = data.identity;

            // If there's an existing identity, log it
            if (this.identity) {
                console.log('Session initialized with existing identity:', this.identity);
            }
        } catch (error) {
            console.error('Error initializing tracking:', error);
        }
    }

    async _ensureInitialized() {
        if (!this.sessionId) {
            await this.initialize();
        }
    }

    async _trackEvent(eventName, properties = {}) {
        await this._ensureInitialized();

        try {
            const response = await fetch(`${this.apiUrl}/track`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    eventName,
                    properties,
                    requestId: this.visitorData.requestId,
                    visitorId: this.visitorData.visitorId,
                    tenantId: this.tenantId
                })
            });

            if (!response.ok) {
                throw new Error('Failed to track event');
            }

            const result = await response.json();
            console.log('Event tracked:', result);
            return result;
        } catch (error) {
            console.error('Error tracking event:', error);
            throw error;
        }
    }

    async page_visit(pageProperties = {}) {
        return this._trackEvent('page_visit', {
            url: window.location.href,
            title: document.title,
            referrer: document.referrer,
            ...pageProperties
        });
    }

    async track(eventName, eventProperties = {}) {
        return this._trackEvent(eventName, eventProperties);
    }

    async identify(userProperties) {
        await this._ensureInitialized();

        try {
            const response = await fetch(`${this.apiUrl}/identify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    userData: userProperties,
                    requestId: this.visitorData.requestId,
                    visitorId: this.visitorData.visitorId,
                    tenantId: this.tenantId
                })
            });

            if (!response.ok) {
                throw new Error('Failed to identify user');
            }

            const result = await response.json();
            this.identity = result.identity;
            console.log('User identified:', result);
            return result;
        } catch (error) {
            console.error('Error identifying user:', error);
            throw error;
        }
    }

    async getAllEvents() {
        await this._ensureInitialized();
        
        try {
            const response = await fetch(`${this.apiUrl}/events/${this.sessionId}?tenantId=${this.tenantId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch events');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching events:', error);
            throw error;
        }
    }
}

// Initialize EventTracker when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("Initializing event tracker");
    EventTracker = new EventTrackerClass();
    window.EventTracker = EventTracker;
    
    // Track initial page visit after initialization
    setTimeout(() => {
        window.EventTracker.page_visit();
    }, 1000);
});
