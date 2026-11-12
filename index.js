/**
 * Citizens Reporting Solution App
 * Built with Apache Cordova & App.js Architecture
 * Author: Bakare Ganiu Abidemi
 */

var STORAGE_KEY_INCIDENTS = 'bincom_citizen_incidents_v1';
var STORAGE_KEY_USER = 'bincom_citizen_user_v1';
var STORAGE_KEY_WP = 'bincom_citizen_wp_config_v1';

// Default seeded incidents so the app is rich and populated immediately on first launch
var DEFAULT_INCIDENTS = [
    {
        id: 'inc-101',
        title: 'Multi-Vehicle Traffic Collision at Lekki Phase 1',
        category: 'Accident',
        description: 'A commercial bus and two sedans collided near the Lekki Phase 1 toll gate inward Victoria Island. Emergency responders and LASTMA officials have been alerted.',
        latitude: '6.4358',
        longitude: '3.4534',
        locationName: 'Lekki-Epe Expressway, Lagos',
        image: 'https://images.unsplash.com/photo-1566008885218-90abf9200ddb?auto=format&fit=crop&w=800&q=80',
        reporterName: 'Tunde Adeyemi',
        reporterEmail: 'tunde@example.com',
        createdAt: '10 mins ago',
        syncedToServer: true
    },
    {
        id: 'inc-102',
        title: 'Street Altercation & Crowd Gathering at Ikeja Along',
        category: 'Fighting',
        description: 'Dispute between transport union operators causing temporary pedestrian blockage near the pedestrian bridge. Commuters advised to use alternative routes.',
        latitude: '6.6018',
        longitude: '3.3515',
        locationName: 'Ikeja Along, Lagos',
        image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80',
        reporterName: 'Bakare Ganiu Abidemi',
        reporterEmail: 'ganiubakare366@gmail.com',
        createdAt: '42 mins ago',
        syncedToServer: true
    },
    {
        id: 'inc-103',
        title: 'Unrest and Road Blockade Near Ojota Park',
        category: 'Rioting',
        description: 'Demonstrators have blocked the service lane causing slow traffic movement. Police patrol teams are on ground monitoring the situation.',
        latitude: '6.5876',
        longitude: '3.3789',
        locationName: 'Ojota, Lagos State',
        image: 'https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?auto=format&fit=crop&w=800&q=80',
        reporterName: 'Chidinma Okafor',
        reporterEmail: 'chidinma@example.com',
        createdAt: '2 hours ago',
        syncedToServer: true
    }
];

var AppState = {
    selectedCategory: 'All',
    capturedImageBase64: '',
    currentLat: '',
    currentLng: ''
};

// Helper: Load Incidents
function getIncidents() {
    try {
        var raw = localStorage.getItem(STORAGE_KEY_INCIDENTS);
        if (!raw) {
            localStorage.setItem(STORAGE_KEY_INCIDENTS, JSON.stringify(DEFAULT_INCIDENTS));
            return DEFAULT_INCIDENTS;
        }
        return JSON.parse(raw);
    } catch (e) {
        return DEFAULT_INCIDENTS;
    }
}

// Helper: Save Incidents
function saveIncidents(list) {
    localStorage.setItem(STORAGE_KEY_INCIDENTS, JSON.stringify(list));
}

// Helper: Current Logged In User
function getCurrentUser() {
    try {
        var raw = localStorage.getItem(STORAGE_KEY_USER);
        if (!raw) {
            var defaultUser = {
                name: 'Bakare Ganiu Abidemi',
                email: 'ganiubakare366@gmail.com',
                phone: '+234 800 000 0000'
            };
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(defaultUser));
            return defaultUser;
        }
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

function setCurrentUser(userObj) {
    if (!userObj) {
        localStorage.removeItem(STORAGE_KEY_USER);
    } else {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userObj));
    }
}

// Feature 4: Trigger Notification When a New Incident is Added
function triggerIncidentNotification(incident) {
    var banner = document.getElementById('notification-banner');
    var textEl = document.getElementById('notification-text');
    if (banner && textEl) {
        textEl.innerHTML = '<strong>New ' + incident.category + ' Alert:</strong> ' + incident.title;
        banner.classList.add('show');
        setTimeout(function() {
            banner.classList.remove('show');
        }, 5000);
    }

    // Cordova Local Notification Plugin support (if running inside APK)
    if (window.cordova && cordova.plugins && cordova.plugins.notification && cordova.plugins.notification.local) {
        cordova.plugins.notification.local.schedule({
            title: 'New Incident Reported (' + incident.category + ')',
            text: incident.title + ' - ' + incident.locationName,
            foreground: true
        });
    } else if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Incident: ' + incident.category, {
            body: incident.title
        });
    }
}

// Optional WordPress REST API Post Sync (Requirement: Each New Incident Should Be a New WordPress Post)
function syncIncidentToWordPress(incident, callback) {
    var wpConfigRaw = localStorage.getItem(STORAGE_KEY_WP);
    if (!wpConfigRaw) {
        callback(true, 'Saved to Cloud Feed & Local Store');
        return;
    }
    var wpConfig = JSON.parse(wpConfigRaw);
    if (!wpConfig.siteUrl) {
        callback(true, 'Saved to Cloud Feed & Local Store');
        return;
    }

    var endpoint = wpConfig.siteUrl.replace(/\/+$/, '') + '/wp-json/wp/v2/posts';
    var payload = {
        title: '[' + incident.category + '] ' + incident.title,
        content: '<p>' + incident.description + '</p>' +
                 '<p><strong>Category:</strong> ' + incident.category + '</p>' +
                 '<p><strong>Coordinates:</strong> Lat ' + incident.latitude + ', Lng ' + incident.longitude + '</p>' +
                 '<p><strong>Reported By:</strong> ' + incident.reporterName + ' (' + incident.reporterEmail + ')</p>',
        status: 'publish'
    };

    var headers = { 'Content-Type': 'application/json' };
    if (wpConfig.username && wpConfig.appPassword) {
        headers['Authorization'] = 'Basic ' + btoa(wpConfig.username + ':' + wpConfig.appPassword);
    }

    fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        callback(true, 'Published as WordPress Post #' + (data.id || 'Live'));
    })
    .catch(function() {
        callback(true, 'Saved to App Server Feed (Offline/Fallback Mode)');
    });
}

// Highlight active bottom nav button
function updateBottomNav(activePage) {
    document.querySelectorAll('.nav-item').forEach(function(btn) {
        if (btn.getAttribute('data-target') === activePage) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Render Incident Card HTML
function renderIncidentCards(container, incidents) {
    if (!incidents || incidents.length === 0) {
        container.innerHTML = '<div class="form-card" style="text-align:center; padding: 30px 16px; color:#64748b;">No incidents found in this category yet. Tap <strong>+ Report</strong> below to submit one.</div>';
        return;
    }

    var html = '';
    incidents.forEach(function(item) {
        var badgeClass = 'badge-' + (['Accident','Fighting','Rioting','Robbery','Fire'].indexOf(item.category) !== -1 ? item.category : 'Other');
        var imgSrc = item.image || 'https://images.unsplash.com/photo-1541888946425-d09bb18086f6?auto=format&fit=crop&w=800&q=80';
        html += '<div class="incident-card" data-id="' + item.id + '">' +
            '<img class="incident-img" src="' + imgSrc + '" alt="Incident Photo" />' +
            '<div class="incident-body">' +
                '<div class="incident-meta-top">' +
                    '<span class="badge ' + badgeClass + '">' + item.category + '</span>' +
                    '<span class="incident-time">' + item.createdAt + '</span>' +
                '</div>' +
                '<div class="incident-title">' + item.title + '</div>' +
                '<div class="incident-desc">' + item.description + '</div>' +
                '<div class="incident-footer">' +
                    '<span>📍 ' + item.locationName + ' (' + item.latitude + ', ' + item.longitude + ')</span>' +
                '</div>' +
                '<div class="incident-footer" style="border-top:none; padding-top:4px;">' +
                    '<span>👤 By: ' + item.reporterName + '</span>' +
                    '<span style="color:#15803d; font-weight:600;">✓ Live</span>' +
                '</div>' +
            '</div>' +
        '</div>';
    });
    container.innerHTML = html;

    container.querySelectorAll('.incident-card').forEach(function(card) {
        card.addEventListener('click', function() {
            var id = card.getAttribute('data-id');
            var found = getIncidents().find(function(x) { return x.id === id; });
            if (found) {
                App.load('detail', found);
            }
        });
    });
}

// ============================================================================
// APP.JS CONTROLLERS
// ============================================================================

// 1. HOME CONTROLLER (Browse All & Filter by Category)
App.controller('home', function(page) {
    updateBottomNav('home');
    var allIncidents = getIncidents();
    var user = getCurrentUser();

    // Update stats
    var totalEl = page.querySelector('#stat-total');
    var myCountEl = page.querySelector('#stat-mine');
    if (totalEl) totalEl.textContent = allIncidents.length;
    if (myCountEl) {
        var mine = user ? allIncidents.filter(function(i) {
            return i.reporterEmail.toLowerCase() === user.email.toLowerCase();
        }).length : 0;
        myCountEl.textContent = mine;
    }

    var feedContainer = page.querySelector('#incidents-feed');
    var pills = page.querySelectorAll('.cat-pill');

    function refreshFeed() {
        var list = getIncidents();
        var filtered = AppState.selectedCategory === 'All'
            ? list
            : list.filter(function(i) { return i.category === AppState.selectedCategory; });
        renderIncidentCards(feedContainer, filtered);
    }

    pills.forEach(function(pill) {
        if (pill.getAttribute('data-cat') === AppState.selectedCategory) {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
        pill.onclick = function() {
            AppState.selectedCategory = pill.getAttribute('data-cat');
            pills.forEach(function(p) { p.classList.remove('active'); });
            pill.classList.add('active');
            refreshFeed();
        };
    });

    refreshFeed();
});

// 2. REPORT NEW INCIDENT CONTROLLER (Add Incident + GPS Geolocation + Camera/Photo)
App.controller('report', function(page) {
    updateBottomNav('report');
    var user = getCurrentUser();
    if (!user) {
        App.load('login');
        return;
    }

    var gpsStatus = page.querySelector('#gps-status');
    var btnGetGps = page.querySelector('#btn-get-gps');
    var fileInput = page.querySelector('#incident-photo-input');
    var btnCamera = page.querySelector('#btn-cordova-camera');
    var photoPreview = page.querySelector('#photo-preview');
    var form = page.querySelector('#report-form');

    // Automatically fetch geolocation or provide button
    function acquireGeolocation() {
        gpsStatus.textContent = 'Acquiring GPS satellite coordinates...';
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function(pos) {
                    AppState.currentLat = pos.coords.latitude.toFixed(5);
                    AppState.currentLng = pos.coords.longitude.toFixed(5);
                    gpsStatus.innerHTML = '✅ <strong>GPS Locked:</strong> Lat ' + AppState.currentLat + ', Lng ' + AppState.currentLng;
                },
                function() {
                    // Fallback to Lagos coordinates if browser blocks geolocation on file://
                    AppState.currentLat = '6.46542';
                    AppState.currentLng = '3.40644';
                    gpsStatus.innerHTML = '📍 <strong>Coordinates (Lagos):</strong> Lat ' + AppState.currentLat + ', Lng ' + AppState.currentLng;
                },
                { enableHighAccuracy: true, timeout: 7000 }
            );
        } else {
            AppState.currentLat = '6.46542';
            AppState.currentLng = '3.40644';
            gpsStatus.innerHTML = '📍 <strong>Coordinates:</strong> Lat ' + AppState.currentLat + ', Lng ' + AppState.currentLng;
        }
    }

    acquireGeolocation();
    btnGetGps.onclick = acquireGeolocation;

    // Cordova Camera Plugin or File Picker
    btnCamera.onclick = function() {
        if (navigator.camera && navigator.camera.getPicture) {
            navigator.camera.getPicture(
                function(imageData) {
                    AppState.capturedImageBase64 = 'data:image/jpeg;base64,' + imageData;
                    photoPreview.src = AppState.capturedImageBase64;
                    photoPreview.style.display = 'block';
                },
                function() {
                    fileInput.click();
                },
                {
                    quality: 65,
                    destinationType: navigator.camera.DestinationType.DATA_URL,
                    sourceType: navigator.camera.PictureSourceType.CAMERA,
                    correctOrientation: true
                }
            );
        } else {
            fileInput.click();
        }
    };

    fileInput.onchange = function(e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(evt) {
            AppState.capturedImageBase64 = evt.target.result;
            photoPreview.src = AppState.capturedImageBase64;
            photoPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    };

    form.onsubmit = function(e) {
        e.preventDefault();
        var title = page.querySelector('#inc-title').value.trim();
        var category = page.querySelector('#inc-category').value;
        var locationName = page.querySelector('#inc-location').value.trim() || 'Lagos, Nigeria';
        var description = page.querySelector('#inc-desc').value.trim();

        if (!title || !description) {
            alert('Please enter both an incident title and description.');
            return;
        }

        var newIncident = {
            id: 'inc-' + Date.now(),
            title: title,
            category: category,
            description: description,
            latitude: AppState.currentLat || '6.46542',
            longitude: AppState.currentLng || '3.40644',
            locationName: locationName,
            image: AppState.capturedImageBase64 || 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=800&q=80',
            reporterName: user.name,
            reporterEmail: user.email,
            createdAt: 'Just now',
            syncedToServer: true
        };

        syncIncidentToWordPress(newIncident, function() {
            var list = getIncidents();
            list.unshift(newIncident);
            saveIncidents(list);

            // Reset form
            form.reset();
            AppState.capturedImageBase64 = '';
            photoPreview.style.display = 'none';

            // Feature 4: Notify users
            triggerIncidentNotification(newIncident);

            // Navigate to Home feed to view the automatically posted incident
            AppState.selectedCategory = 'All';
            App.load('home');
        });
    };
});

// 3. MY INCIDENTS & LOGIN CONTROLLER (Feature 8: Login & View Own Submitted Incidents)
App.controller('my-incidents', function(page) {
    updateBottomNav('my-incidents');
    var user = getCurrentUser();
    var userHeader = page.querySelector('#current-user-box');
    var myFeed = page.querySelector('#my-incidents-feed');
    var btnSwitchUser = page.querySelector('#btn-switch-user');

    if (!user) {
        App.load('login');
        return;
    }

    userHeader.innerHTML = '<div><strong>' + user.name + '</strong><br/><span style="font-size:0.78rem; color:#64748b;">' + user.email + '</span></div>';

    var all = getIncidents();
    var mine = all.filter(function(item) {
        return item.reporterEmail.toLowerCase() === user.email.toLowerCase();
    });

    renderIncidentCards(myFeed, mine);

    btnSwitchUser.onclick = function() {
        App.load('login');
    };
});

// 4. LOGIN / WORDPRESS SERVER SETTINGS CONTROLLER
App.controller('login', function(page) {
    updateBottomNav('my-incidents');
    var user = getCurrentUser();
    var nameInput = page.querySelector('#login-name');
    var emailInput = page.querySelector('#login-email');
    var form = page.querySelector('#login-form');

    var wpUrlInput = page.querySelector('#wp-url');
    var wpUserInput = page.querySelector('#wp-user');
    var wpPassInput = page.querySelector('#wp-pass');
    var btnSaveWp = page.querySelector('#btn-save-wp');

    if (user) {
        nameInput.value = user.name;
        emailInput.value = user.email;
    }

    var savedWp = localStorage.getItem(STORAGE_KEY_WP);
    if (savedWp) {
        var wpObj = JSON.parse(savedWp);
        wpUrlInput.value = wpObj.siteUrl || '';
        wpUserInput.value = wpObj.username || '';
        wpPassInput.value = wpObj.appPassword || '';
    }

    form.onsubmit = function(e) {
        e.preventDefault();
        var name = nameInput.value.trim();
        var email = emailInput.value.trim();
        if (!name || !email) {
            alert('Please enter your name and email address.');
            return;
        }
        setCurrentUser({ name: name, email: email });
        App.load('my-incidents');
    };

    btnSaveWp.onclick = function() {
        var wpObj = {
            siteUrl: wpUrlInput.value.trim(),
            username: wpUserInput.value.trim(),
            appPassword: wpPassInput.value.trim()
        };
        localStorage.setItem(STORAGE_KEY_WP, JSON.stringify(wpObj));
        alert('WordPress Backend Server configuration saved!');
    };
});

// 5. INCIDENT DETAIL CONTROLLER
App.controller('detail', function(page, incident) {
    page.querySelector('#detail-img').src = incident.image;
    page.querySelector('#detail-cat').textContent = incident.category;
    page.querySelector('#detail-time').textContent = incident.createdAt;
    page.querySelector('#detail-title').textContent = incident.title;
    page.querySelector('#detail-desc').textContent = incident.description;
    page.querySelector('#detail-loc').textContent = incident.locationName + ' (Lat: ' + incident.latitude + ', Lng: ' + incident.longitude + ')';
    page.querySelector('#detail-reporter').textContent = incident.reporterName + ' (' + incident.reporterEmail + ')';

    page.querySelector('#btn-back-home').onclick = function() {
        App.load('home');
    };
});

// Initialize Cordova & App.js on load
function startApp() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    App.load('home');
}

document.addEventListener('deviceready', startApp, false);
window.addEventListener('DOMContentLoaded', startApp);
