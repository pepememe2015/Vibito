
        // ========== دیکشنری ترجمه ==========
        const translations = {
            fa: {
                home: "خانه", mySongs: "آهنگ‌های من", liked: "لایک شده‌ها", popular: "محبوب‌ترین‌ها", playlists: "پلی‌لیست‌ها",
                yourPlaylists: "پلی‌لیست‌های شما", newPlaylist: "پلی‌لیست جدید", colorTheme: "تم رنگی", nightMode: "حالت شب",
                signup: "ثبت‌نام", login: "ورود", logout: "خروج", createPlaylist: "ساخت پلی‌لیست", create: "ساخت",
                cancel: "انصراف", addToPlaylist: "اضافه به پلی‌لیست", searchPlaceholder: "جستجوی آهنگ، خواننده...",
                welcome: "به کتابخانه موسیقی خود خوش آمدید", shufflePlay: "پخش تصادفی", forYou: "برای شما",
                newest: "جدیدترین آهنگ‌ها", mostPopular: "محبوب‌ترین آهنگ‌ها", topArtists: "بیشترین پخش از خواننده‌ها",
                seeAll: "مشاهده همه", backToHome: "بازگشت به خانه", noSongs: "آهنگی نیست", uploadSong: "آهنگتو اینجا بنداز",
                clickOrDrag: "کلیک کن / بکش اینجا", upload: "آپلود", uploading: "آپلود...", uploadSuccess: "✓ آپلود موفق!",
                uploadError: "✗ خطا", likedSongs: "لایک شده‌ها", myUploads: "آهنگ‌هایی که آپلود کرده‌اید",
                share: "اشتراک", delete: "حذف", addToQueue: "در صف پخش", emptyQueue: "آهنگی در صف نیست",
                nowPlaying: "در حال پخش", repeatOne: "تکرار یک آهنگ", repeatAll: "تکرار همه", shuffle: "شفل",
                normalMode: "حالت عادی", like: "لایک", addToPlaylistBtn: "اضافه به پلی‌لیست", loading: "بارگذاری...", audius: "آهنگ‌های آنلاین (Audius)"
            },
            en: {
                home: "Home", mySongs: "My Songs", liked: "Liked", popular: "Most Liked", playlists: "Playlists",
                yourPlaylists: "Your Playlists", newPlaylist: "New Playlist", colorTheme: "Color Theme", nightMode: "Night Mode",
                signup: "Sign Up", login: "Login", logout: "Logout", createPlaylist: "Create Playlist", create: "Create",
                cancel: "Cancel", addToPlaylist: "Add to Playlist", searchPlaceholder: "Search song, artist...",
                welcome: "Welcome to your music library", shufflePlay: "Shuffle Play", forYou: "For You",
                newest: "Newest Songs", mostPopular: "Most Popular", topArtists: "Top Artists",
                seeAll: "See all", backToHome: "Back to Home", noSongs: "No songs", uploadSong: "Drop your song here",
                clickOrDrag: "Click or drag", upload: "Upload", uploading: "Uploading...", uploadSuccess: "✓ Upload successful!",
                uploadError: "✗ Error", likedSongs: "Liked Songs", myUploads: "Songs you have uploaded",
                share: "Share", delete: "Delete", addToQueue: "Queue", emptyQueue: "No songs in queue",
                nowPlaying: "Now Playing", repeatOne: "Repeat One", repeatAll: "Repeat All", shuffle: "Shuffle",
                normalMode: "Normal Mode", like: "Like", addToPlaylistBtn: "Add to Playlist", loading: "Loading...", audius: "Online Songs (Audius)"
            }
        };

        let currentLang = localStorage.getItem('language') || 'fa';

        function setLanguage(lang) {
            currentLang = lang;
            localStorage.setItem('language', lang);
            if (lang === 'fa') {
                document.documentElement.setAttribute('dir', 'ltr');
                document.documentElement.setAttribute('lang', 'fa');
                document.getElementById('langText').innerText = 'English';
            } else {
                document.documentElement.setAttribute('dir', 'ltr');
                document.documentElement.setAttribute('lang', 'en');
                document.getElementById('langText').innerText = 'فارسی';
            }
            document.getElementById('global-search').placeholder = translations[lang].searchPlaceholder;
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (translations[lang][key]) {
                    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = translations[lang][key];
                    else el.innerText = translations[lang][key];
                }
            });
            // به روز رسانی صفحات داینامیک
            if (typeof currentView !== 'undefined') {
                if (currentView === 'home') {
                    if (window.currentHomeSubPageType) {
                        if (window.currentHomeSubPageType === 'foryou') renderForYouFullPage();
                        else if (window.currentHomeSubPageType === 'recent') renderRecentFullPage();
                        else if (window.currentHomeSubPageType === 'popular') renderPopularFullPage();
                        else if (window.currentHomeSubPageType === 'artists') renderArtistsFullPage();
                    } else loadHome();
                } else if (currentView === 'mysongs') loadMySongs();
                else if (currentView === 'liked') loadLikedSongs();
                else if (currentView === 'popular') loadMostLiked();
                else if (currentView === 'playlists') loadPlaylistsView();
                else if (currentView === 'audius') window.loadAudiusView();
                else if (currentView === 'playlist_detail' && window.currentPlaylistId) loadPlaylistDetail(window.currentPlaylistId);
            }
        }

        window.toggleLanguage = function() {
            setLanguage(currentLang === 'fa' ? 'en' : 'fa');
        };

        // ========== بقیه توابع اصلی (پلیر، API، رندر صفحات) ==========
        // (ادامه در قسمت ۲)// ========== توابع پایه و پلیر ==========
window.toggleMobileMenu = function() { document.getElementById('sidebar').classList.toggle('open'); }
window.closeMobileMenu = function() { document.getElementById('sidebar').classList.remove('open'); }

window.toggleExpandedPlayer = function() {
    const expanded = document.getElementById('expandedPlayer');
    if (expanded.classList.contains('show')) window.closeExpandedPlayer();
    else expanded.classList.add('show');
}
window.closeExpandedPlayer = function() { document.getElementById('expandedPlayer').classList.remove('show'); }

let playMode = 'normal';
let currentQueue = [], currentQueueIndex = -1;
let currentPlayingSong = null;
let audio = new Audio();
let isPlaying = false;

window.setPlayMode = function(mode) {
    playMode = mode;
    const oneBtn = document.getElementById('repeatOneBtn');
    const allBtn = document.getElementById('repeatAllBtn');
    const shuffleBtn = document.getElementById('shuffleModeBtn');
    oneBtn.classList.remove('active'); allBtn.classList.remove('active'); shuffleBtn.classList.remove('active');
    if (mode === 'one') { oneBtn.classList.add('active'); window.showToast('🔂 ' + (currentLang === 'fa' ? 'تکرار یک آهنگ فعال شد' : 'Repeat One activated')); }
    else if (mode === 'all') { allBtn.classList.add('active'); window.showToast('🔁 ' + (currentLang === 'fa' ? 'تکرار همه آهنگ‌ها فعال شد' : 'Repeat All activated')); }
    else if (mode === 'shuffle') { shuffleBtn.classList.add('active'); window.showToast('🎲 ' + (currentLang === 'fa' ? 'شفل فعال شد' : 'Shuffle activated')); shuffleCurrentQueue(); }
    else window.showToast('⏹️ ' + (currentLang === 'fa' ? 'حالت عادی' : 'Normal Mode'));
}

function shuffleCurrentQueue() { 
    if (!currentQueue.length) return; 
    const currentId = currentPlayingSong?.id; 
    const filtered = currentQueue.filter(s => s.id !== currentId); 
    const shuffled = [...filtered]; 
    for (let i=shuffled.length-1; i>0; i--) { 
        const j=Math.floor(Math.random()*(i+1)); 
        [shuffled[i], shuffled[j]]=[shuffled[j], shuffled[i]]; 
    } 
    currentQueue = [currentPlayingSong, ...shuffled]; 
    currentQueueIndex = 0; 
    updateQueueDisplay(); 
}

function buildQueueFromSongs(songs, startSongId) { 
    const startIdx = songs.findIndex(s => s.id === startSongId); 
    if (startIdx === -1) { currentQueue = [...songs]; currentQueueIndex = 0; } 
    else { currentQueue = [...songs.slice(startIdx), ...songs.slice(0, startIdx)]; currentQueueIndex = 0; } 
    if (playMode === 'shuffle') shuffleCurrentQueue(); 
    updateQueueDisplay(); 
}

function updateQueueDisplay() { 
    const container = document.getElementById('queueList'); 
    if (!container) return; 
    if (!currentQueue.length) { 
        container.innerHTML = '<div class="empty-state"><div class="empty-icon-container"><div class="empty-record"></div><i class="fas fa-music empty-note"></i></div><h3>' + ((currentLang === 'fa' ? 'آهنگی در صف نیست' : 'No songs in queue')) + '</h3><p>' + (currentLang === "fa" ? "موردی برای نمایش وجود ندارد." : "Nothing to show here.") + '</p></div>'; 
        return; 
    }
    container.innerHTML = currentQueue.map((s,idx) => `<div class="queue-item ${idx===currentQueueIndex?'active':''}" onclick="window.playFromQueue(${idx})"><div class="queue-item-info"><div class="queue-item-title">${escapeHtml(s.title)}</div><div class="queue-item-artist">${escapeHtml(s.artist)}</div></div>${idx===currentQueueIndex ? '<div class="queue-item-playing"><i class="fas fa-volume-up"></i></div>' : ''}</div>`).join(''); 
}

window.playFromQueue = function(index) { 
    if (index>=0 && index<currentQueue.length) { 
        currentQueueIndex = index; 
        currentPlayingSong = currentQueue[index]; 
        audio.src = `/stream/${currentPlayingSong.id}`; 
        audio.play(); 
        updateNowPlayingUI(); 
        updateQueueDisplay(); 
        fetchPlay(currentPlayingSong.id); 
        window.closeExpandedPlayer();
    } 
}

function playNextInQueue() {
    if (playMode === 'one') { audio.currentTime = 0; audio.play(); return; }
    if (playMode === 'shuffle') {
        if (currentQueue.length <= 1) { if (currentQueue.length===1) { audio.currentTime=0; audio.play(); return; } return; }
        let newIdx = currentQueueIndex;
        while (newIdx === currentQueueIndex && currentQueue.length>1) newIdx = Math.floor(Math.random()*currentQueue.length);
        currentQueueIndex = newIdx; currentPlayingSong = currentQueue[currentQueueIndex];
        audio.src = `/stream/${currentPlayingSong.id}`; audio.play();
        updateNowPlayingUI(); updateQueueDisplay(); fetchPlay(currentPlayingSong.id);
        return;
    }
    if (playMode === 'all' || playMode === 'normal') {
        if (currentQueueIndex + 1 < currentQueue.length) {
            currentQueueIndex++; currentPlayingSong = currentQueue[currentQueueIndex];
            audio.src = `/stream/${currentPlayingSong.id}`; audio.play();
            updateNowPlayingUI(); updateQueueDisplay(); fetchPlay(currentPlayingSong.id);
        } else if (playMode === 'all' && currentQueue.length > 0) {
            currentQueueIndex = 0; currentPlayingSong = currentQueue[0];
            audio.src = `/stream/${currentPlayingSong.id}`; audio.play();
            updateNowPlayingUI(); updateQueueDisplay(); fetchPlay(currentPlayingSong.id);
        }
    }
}

function fetchPlay(songId) { if (!token) return; fetch(`/play/?song_id=${songId}`, {method:'POST',headers:{'Authorization':`Bearer ${token}`}}).catch(e=>{}); }

// ========== گرینگ و تم ==========
window.getGreeting = function() { const h = new Date().getHours(); if (h>=5 && h<12) return { text: (currentLang === 'fa' ? 'صبح بخیر' : 'Good Morning'), icon:"fas fa-sun" }; if (h>=12 && h<17) return { text: (currentLang === 'fa' ? 'بعدازظهر بخیر' : 'Good Afternoon'), icon:"fas fa-sun" }; if (h>=17 && h<21) return { text: (currentLang === 'fa' ? 'عصر بخیر' : 'Good Evening'), icon:"fas fa-cloud-sun" }; return { text: (currentLang === 'fa' ? 'شب بخیر' : 'Good Night'), icon:"fas fa-moon" }; }
window.setTheme = function(t) { 
    ['purple','blue','emerald','rose','slate'].forEach(th=>document.body.classList.remove(`theme-${th}`)); 
    document.body.classList.add(`theme-${t}`); 
    localStorage.setItem('theme',t); 
    document.querySelectorAll('.theme-btn').forEach(btn=>btn.classList.remove('active')); 
    document.querySelector(`.theme-${t}-btn`)?.classList.add('active'); 
}
window.toggleMode = function() { 
    if(document.body.classList.contains('light-mode')){ document.body.classList.remove('light-mode'); localStorage.setItem('mode','dark'); } 
    else { document.body.classList.add('light-mode'); localStorage.setItem('mode','light'); } 
}
function loadTheme() { const st=localStorage.getItem('theme'); if(st) window.setTheme(st); else document.querySelector('.theme-emerald-btn')?.classList.add('active'); if(localStorage.getItem('mode')==='light') document.body.classList.add('light-mode'); }
function hidePageLoader() { document.getElementById('page-loader')?.classList.add('hidden'); }

// ========== STATE ==========
let token = localStorage.getItem('user_token');
let username = localStorage.getItem('username');
let authMode = 'login';
let currentSongs = [], mySongs = [], likedSongs = [], popularSongs = [], newSongs = [], recommendedSongs = [], topArtists = [], playlists = [], userPlayHistory = [], userLikes = [];
let likedStatus = new Map();
let currentView = 'home', currentPage = 1, itemsPerPage = 12, selectedFile = null;
let currentPlaylistId = null;

// ========== API CALLS ==========
async function loadPlaylistsSidebar() { if(!token) return; try{ const res=await fetch('/playlists/',{headers:{'Authorization':`Bearer ${token}`}}); if(res.ok){ playlists=await res.json(); renderPlaylistsSidebar(); } }catch(e){} }
function renderPlaylistsSidebar() { const cont=document.getElementById('sidebar-playlists-list'); if(!cont) return; if(!playlists?.length){ cont.innerHTML='<div style="padding:8px 12px;">' + (currentLang === 'fa' ? 'پلی‌لیستی نیست' : 'No playlists') + '</div>'; return; } cont.innerHTML=playlists.map(p=>`<div class="playlist-item" onclick="window.switchView('playlist_detail',${p.id})"><i class="fas fa-music"></i> ${escapeHtml(p.name)} (${p.song_count})</div>`).join(''); }
window.showCreatePlaylistModal = function(){ if(!token){ window.showToast(currentLang === 'fa' ? 'وارد شوید' : 'Please login', true); return; } document.getElementById('create-playlist-modal').style.display='flex'; }
window.closeCreatePlaylistModal = function(){ document.getElementById('create-playlist-modal').style.display='none'; document.getElementById('newPlaylistName').value=''; }
window.createPlaylist = async function(){ const name=document.getElementById('newPlaylistName').value; if(!name){ window.showToast(currentLang === 'fa' ? 'اسم را وارد کنید' : 'Enter name', true); return; } try{ const res=await fetch(`/playlist/create?name=${encodeURIComponent(name)}`,{method:'POST',headers:{'Authorization':`Bearer ${token}`}}); if(res.ok){ window.showToast(currentLang === 'fa' ? 'پلی‌لیست ساخته شد!' : 'Playlist created!'); window.closeCreatePlaylistModal(); await loadPlaylistsSidebar(); if(currentView==='playlists') await loadPlaylistsView(); } else window.showToast(currentLang === 'fa' ? 'خطا' : 'Error', true); }catch(e){ window.showToast(currentLang === 'fa' ? 'خطا' : 'Error', true); } }
async function deletePlaylist(pid){ if(!confirm(currentLang === 'fa' ? 'حذف شود؟' : 'Delete?')) return; try{ await fetch(`/playlist/${pid}`,{method:'DELETE',headers:{'Authorization':`Bearer ${token}`}}); window.showToast(currentLang === 'fa' ? 'حذف شد' : 'Deleted'); await loadPlaylistsSidebar(); if(currentView==='playlists') await loadPlaylistsView(); else if(currentView==='playlist_detail') await window.switchView('playlists'); }catch(e){ window.showToast(currentLang === 'fa' ? 'خطا' : 'Error', true); } }
function sharePlaylist(id,name){ navigator.clipboard.writeText(`${location.origin}/shared-playlist/${id}`); window.showToast(`${currentLang === 'fa' ? 'لینک' : 'Link'} "${name}" ${currentLang === 'fa' ? 'کپی شد!' : 'copied!'}`); }
async function loadPlaylistsView(){ if(!token){ document.getElementById('dynamic-content').innerHTML='<div class="hero-section"><div class="greeting-section"><h1><i class="fas fa-list"></i> ' + (currentLang === 'fa' ? 'پلی‌لیست‌ها' : 'Playlists') + '</h1></div></div><p>' + (currentLang === 'fa' ? 'وارد شوید' : 'Please login') + '</p>'; return; } document.getElementById('dynamic-content').innerHTML='<div class="hero-section"><div class="greeting-section"><h1><i class="fas fa-list"></i> ' + (currentLang === 'fa' ? 'پلی‌لیست‌ها' : 'Playlists') + '</h1></div></div><div class="search-loading"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>'; try{ const res=await fetch('/playlists/',{headers:{'Authorization':`Bearer ${token}`}}); playlists=await res.json(); const html=`<div class="hero-section"><div class="greeting-section"><h1><i class="fas fa-list"></i> ${currentLang === 'fa' ? 'پلی‌لیست‌های من' : 'My Playlists'}</h1></div></div><button class="create-playlist-btn" onclick="window.showCreatePlaylistModal()" style="width:180px;margin-bottom:20px;"><i class="fas fa-plus"></i> ${currentLang === 'fa' ? 'جدید' : 'New'}</button><div class="songs-grid" id="playlistsGrid"></div>`; document.getElementById('dynamic-content').innerHTML=html; const grid=document.getElementById('playlistsGrid'); if(!playlists?.length){ grid.innerHTML='<div class="empty-state"><div class="empty-icon-container"><div class="empty-record"></div><i class="fas fa-music empty-note"></i></div><h3>' + ((currentLang === 'fa' ? 'هیچ پلی‌لیستی ندارید' : 'No playlists')) + '</h3><p>' + (currentLang === "fa" ? "موردی برای نمایش وجود ندارد." : "Nothing to show here.") + '</p></div>'; return; } grid.innerHTML=playlists.map(p=>`<div class="song-card" onclick="window.switchView('playlist_detail',${p.id})"><div class="song-cover"><i class="fas fa-list" style="font-size:48px;"></i></div><h4>${escapeHtml(p.name)}</h4><p>${p.song_count} ${currentLang === 'fa' ? 'آهنگ' : 'songs'}</p><div style="display:flex;gap:8px;margin-top:8px;"><button class="remove-from-playlist" style="background:#1ed760;color:#000;" onclick="event.stopPropagation(); sharePlaylist('${p.share_id}','${escapeHtml(p.name)}')"><i class="fas fa-share-alt"></i> ${currentLang === 'fa' ? 'اشتراک' : 'Share'}</button><button class="remove-from-playlist" style="color:#f44336;" onclick="event.stopPropagation(); deletePlaylist(${p.id})"><i class="fas fa-trash-alt"></i> ${currentLang === 'fa' ? 'حذف' : 'Delete'}</button></div></div>`).join(''); }catch(e){ window.showError(); } }
async function loadPlaylistDetail(pid){ currentPlaylistId = pid; document.getElementById('dynamic-content').innerHTML='<div class="hero-section"><div class="greeting-section"><h1><i class="fas fa-list"></i> ' + (currentLang === 'fa' ? 'پلی‌لیست' : 'Playlist') + '</h1></div></div><div class="search-loading"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>'; try{ const res=await fetch(`/playlist/${pid}`,{headers:{'Authorization':`Bearer ${token}`}}); let _t_songs = await res.json(); const songs = _t_songs.items ? _t_songs.items : _t_songs; const playlist=playlists.find(p=>p.id===pid); const html=`<div class="playlist-header"><div class="playlist-cover"><i class="fas fa-list"></i></div><div class="playlist-info"><h1>${escapeHtml(playlist?.name)}</h1><p>${songs.length} ${currentLang === 'fa' ? 'آهنگ' : 'songs'}</p><div class="playlist-actions"><button class="btn-share" onclick="sharePlaylist('${playlist?.share_id}','${escapeHtml(playlist?.name)}')"><i class="fas fa-share-alt"></i> ${currentLang === 'fa' ? 'اشتراک' : 'Share'}</button><button class="shuffle-playlist-btn" onclick="shufflePlaylistSongs(${JSON.stringify(songs)},'${escapeHtml(playlist?.name)}')"><i class="fas fa-random"></i> ${currentLang === 'fa' ? 'پخش تصادفی' : 'Shuffle'}</button><button class="btn-delete-playlist" onclick="deletePlaylist(${pid})"><i class="fas fa-trash-alt"></i> ${currentLang === 'fa' ? 'حذف' : 'Delete'}</button></div></div></div><div class="songs-container"><div id="playlistSongsGrid" class="songs-grid"></div></div>`; document.getElementById('dynamic-content').innerHTML=html; const grid=document.getElementById('playlistSongsGrid'); if(!songs.length){ grid.innerHTML='<div class="empty-state"><div class="empty-icon-container"><div class="empty-record"></div><i class="fas fa-music empty-note"></i></div><h3>' + ((currentLang === 'fa' ? 'آهنگی نیست' : 'No songs')) + '</h3><p>' + (currentLang === "fa" ? "موردی برای نمایش وجود ندارد." : "Nothing to show here.") + '</p></div>'; return; } grid.innerHTML=songs.map(s=>`<div class="song-card" onclick='window.playSongFromPlaylist(${s.id})'><div class="song-cover"><img src="/cover/${s.id}" onerror="this.innerHTML='<i class=\'fas fa-music\'></i>'"><div class="play-overlay"><i class="fas fa-play"></i></div></div><h4>${escapeHtml(s.title)}</h4><p>${escapeHtml(s.artist)}</p><div class="song-actions"><button class="share-btn-card" onclick="event.stopPropagation(); window.shareSong(${s.id},'${escapeHtml(s.title)}','${escapeHtml(s.artist)}')"><i class="fas fa-share-alt"></i></button></div></div>`).join(''); }catch(e){ window.showError(); } }
window.playSongFromPlaylist = function(sid){ const s=currentSongs.find(x=>x.id===sid); if(s) { playSong(s,currentSongs); } }
function shufflePlaylistSongs(songs,name){ if(!songs.length){ window.showToast(currentLang === 'fa' ? 'پلی‌لیست خالی است' : 'Playlist is empty', true); return; } const shuffled=[...songs]; for(let i=shuffled.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]; } if(shuffled[0]) playSong(shuffled[0],shuffled); }
window.showAddToPlaylistModal = function(sid){ if(!token){ window.showToast(currentLang === 'fa' ? 'وارد شوید' : 'Please login', true); return; } if(!sid) return; currentSongForPlaylist=sid; const listDiv=document.getElementById('playlistSelectList'); if(!playlists?.length) listDiv.innerHTML='<p>' + (currentLang === 'fa' ? 'پلی‌لیستی ندارید' : 'No playlists') + '</p>'; else listDiv.innerHTML=playlists.map(p=>`<div class="playlist-item" onclick="addToPlaylist(${p.id})" style="margin:8px 0;"><i class="fas fa-music"></i> ${escapeHtml(p.name)} (${p.song_count})</div>`).join(''); document.getElementById('add-to-playlist-modal').style.display='flex'; }
window.closeAddToPlaylistModal = function(){ document.getElementById('add-to-playlist-modal').style.display='none'; currentSongForPlaylist=null; }
let currentSongForPlaylist=null;
async function addToPlaylist(pid){ if(!currentSongForPlaylist) return; try{ const res=await fetch(`/playlist/${pid}/add/${currentSongForPlaylist}`,{method:'POST',headers:{'Authorization':`Bearer ${token}`}}); if(res.ok){ window.showToast(currentLang === 'fa' ? 'اضافه شد!' : 'Added!'); window.closeAddToPlaylistModal(); await loadPlaylistsSidebar(); }else window.showToast(currentLang === 'fa' ? 'خطا' : 'Error', true); }catch(e){ window.showToast(currentLang === 'fa' ? 'خطا' : 'Error', true); } }

// ========== PLAYER CORE ==========
function playSong(song, queueSongs) { 
    currentPlayingSong = song; 
    if (queueSongs && queueSongs.length) buildQueueFromSongs(queueSongs, song.id);
    else { currentQueue = [song]; currentQueueIndex = 0; updateQueueDisplay(); } 
    audio.src = `/stream/${song.id}`; 
    audio.play(); 
    updateNowPlayingUI(); 
    fetchPlay(song.id); 
}

function updateNowPlayingUI() { 
    if (!currentPlayingSong) return; 
    document.getElementById('npTitle').innerText = currentPlayingSong.title; 
    document.getElementById('npArtist').innerText = currentPlayingSong.artist; 
    document.getElementById('expTitle').innerText = currentPlayingSong.title; 
    document.getElementById('expArtist').innerText = currentPlayingSong.artist; 
    const cover = `/cover/${currentPlayingSong.id}`; 
    document.getElementById('npCoverImg').src = cover; 
    document.getElementById('expCoverImg').src = cover; 
    document.getElementById('nowPlayingBar').classList.remove('empty'); 
    updatePlayerLikeButton(); 
    updatePlayButtonUI(); 
}

function updatePlayerLikeButton() { 
    const liked = likedStatus.get(currentPlayingSong?.id) || false; 
    const btn = document.getElementById('likeBtnExp'); 
    if (btn) { if (liked) btn.classList.add('liked'); else btn.classList.remove('liked'); } 
}

function updatePlayButtonUI() { 
    const icon = isPlaying ? 'fa-pause' : 'fa-play'; 
    const mini = document.getElementById('playPauseMini'); 
    const exp = document.getElementById('playPauseExp'); 
    if (mini) mini.innerHTML = `<i class="fas ${icon}"></i>`; 
    if (exp) exp.innerHTML = `<i class="fas ${icon}"></i>`; 
}

window.previousSong = function() { 
    if (currentQueueIndex > 0) { 
        currentQueueIndex--; 
        currentPlayingSong = currentQueue[currentQueueIndex]; 
        audio.src = `/stream/${currentPlayingSong.id}`; 
        audio.play(); 
        updateNowPlayingUI(); 
        updateQueueDisplay(); 
        fetchPlay(currentPlayingSong.id); 
    } 
}

window.nextSong = function() { playNextInQueue(); }
window.togglePlay = function() { isPlaying ? audio.pause() : audio.play(); }

function updateProgress() { 
    const percent = (audio.currentTime / audio.duration) * 100; 
    document.getElementById('expProgressFill').style.width = percent + '%'; 
    document.getElementById('miniProgressFill').style.width = percent + '%'; 
    document.getElementById('expCurrentTime').innerText = formatTime(audio.currentTime); 
    document.getElementById('expTotalTime').innerText = formatTime(audio.duration); 
}

window.seekExpanded = function(e) { 
    const rect = e.currentTarget.getBoundingClientRect(); 
    const percent = (e.clientX - rect.left) / rect.width; 
    audio.currentTime = percent * audio.duration; 
}

function formatTime(sec) { if (isNaN(sec)) return '0:00'; return `${Math.floor(sec/60)}:${Math.floor(sec%60).toString().padStart(2,'0')}`; }

window.toggleLikeCurrent = async function() { 
    if (!token || !currentPlayingSong) return; 
    try { 
        const res = await fetch(`/like/${currentPlayingSong.id}`, {method:'POST',headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'}}); 
        if (res.ok) { 
            const data = await res.json(); 
            likedStatus.set(currentPlayingSong.id, data.liked); 
            updatePlayerLikeButton(); 
            if (currentView === 'liked') await loadLikedSongs(); 
            else await loadHome(); 
        } 
    } catch(e) {} 
}

async function toggleLikeFromCard(sid, btn) { 
    if (!token) { window.showToast(currentLang === 'fa' ? 'وارد شوید' : 'Please login', true); return; } 
    try { 
        const res = await fetch(`/like/${sid}`, {method:'POST',headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'}}); 
        if (res.ok) { 
            const data = await res.json(); 
            if (data.liked) { btn.classList.add('liked'); likedStatus.set(sid,true); } 
            else { btn.classList.remove('liked'); likedStatus.set(sid,false); } 
            await loadHome(); 
            if (currentView === 'liked') await loadLikedSongs(); 
        } 
    } catch(e) {} 
}// ========== صفحه اصلی ==========
async function loadHome() { 
    window.currentHomeSubPageType = null; 
    window.homeBackStack = []; 
    document.getElementById('dynamic-content').innerHTML = `<div class="hero-section"><div class="greeting-section"><h1><i class="${window.getGreeting().icon}"></i> ${window.getGreeting().text}</h1><div class="greeting-sub" data-i18n="welcome">${translations[currentLang].welcome}</div></div><button class="shuffle-btn" onclick="shuffleAllSongs()"><i class="fas fa-random"></i> <span data-i18n="shufflePlay">${translations[currentLang].shufflePlay}</span></button></div><div id="homeSectionsContainer"><div class="search-loading"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>`; 
    try { const res = await fetch('/songs/'); let __d1 = await res.json(); currentSongs = __d1.items ? __d1.items : __d1; newSongs = [...currentSongs].sort((a,b)=>b.id-a.id); popularSongs = [...currentSongs].sort((a,b)=>(b.like_count||0)-(a.like_count||0)); if (token) { const likesRes = await fetch('/liked-songs/', {headers:{'Authorization':`Bearer ${token}`}}); if (likesRes.ok) { let _likeData = await likesRes.json(); userLikes = (_likeData.items ? _likeData.items : _likeData).map(s=>s.id); } await loadUserPlayHistory(); } await checkLikedStatus(currentSongs); analyzeTopArtists(); generateRecommendations(); renderHomeSections(); } catch(e) { window.showError(); } }

function generateRecommendations() { 
    if (!currentSongs.length) { recommendedSongs = []; return; } 
    const interactedIds = [...new Set([...userLikes, ...userPlayHistory.map(p=>p.song_id)])]; 
    if (interactedIds.length===0) { recommendedSongs = popularSongs.slice(0,12); return; } 
    const artistScores = new Map(); 
    currentSongs.filter(s=>interactedIds.includes(s.id)).forEach(s=>{ const score=userLikes.includes(s.id)?2:1; artistScores.set(s.artist,(artistScores.get(s.artist)||0)+score); }); 
    const recommended=[]; const added=new Set(interactedIds); 
    const topArtistsList = Array.from(artistScores.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5).map(a=>a[0]); 
    for(const artist of topArtistsList){ for(const song of currentSongs.filter(s=>s.artist===artist && !added.has(s.id)).slice(0,3)){ if(!added.has(song.id)){ recommended.push(song); added.add(song.id); } } } 
    for(const song of popularSongs){ if(!added.has(song.id) && recommended.length<12){ recommended.push(song); added.add(song.id); } } 
    recommendedSongs = recommended;
}

function renderHomeSections() { 
    const container = document.getElementById('homeSectionsContainer'); 
    if (!container) return; 
    const forYou = `<div class="section-header"><h2><i class="fas fa-star"></i> <span data-i18n="forYou">${translations[currentLang].forYou}</span></h2><a onclick="window.goToHomeSubPage('foryou')">${translations[currentLang].seeAll} <i class="fas fa-chevron-right"></i></a></div><div class="cards-scroll">${recommendedSongs.slice(0,10).map(s=>`<div class="section-card" onclick='window.playFromHome(${s.id})'><div class="section-card-img"><img src="/cover/${s.id}" onerror="this.src='data:image/svg+xml...'"></div><div class="section-card-title">${escapeHtml(s.title)}</div><div class="section-card-subtitle">${escapeHtml(s.artist)}</div><div class="song-actions"><span class="like-count"><i class="fas fa-heart"></i> ${s.like_count||0}</span><button class="like-btn-card ${likedStatus.get(s.id)?'liked':''}" onclick="event.stopPropagation(); toggleLikeFromCard(${s.id}, this)"><i class="fas fa-heart"></i></button></div></div>`).join('')}</div>`; 
    const recent = `<div class="section-header"><h2><i class="fas fa-clock"></i> <span data-i18n="newest">${translations[currentLang].newest}</span></h2><a onclick="window.goToHomeSubPage('recent')">${translations[currentLang].seeAll} <i class="fas fa-chevron-right"></i></a></div><div class="cards-scroll">${newSongs.slice(0,10).map(s=>`<div class="section-card" onclick='window.playFromHome(${s.id})'><div class="section-card-img"><img src="/cover/${s.id}" onerror="this.src='data:image/svg+xml...'"></div><div class="section-card-title">${escapeHtml(s.title)}</div><div class="section-card-subtitle">${escapeHtml(s.artist)}</div><div class="song-actions"><span class="like-count"><i class="fas fa-heart"></i> ${s.like_count||0}</span><button class="like-btn-card ${likedStatus.get(s.id)?'liked':''}" onclick="event.stopPropagation(); toggleLikeFromCard(${s.id}, this)"><i class="fas fa-heart"></i></button></div></div>`).join('')}</div>`; 
    const popular = `<div class="section-header"><h2><i class="fas fa-fire"></i> <span data-i18n="mostPopular">${translations[currentLang].mostPopular}</span></h2><a onclick="window.goToHomeSubPage('popular')">${translations[currentLang].seeAll} <i class="fas fa-chevron-right"></i></a></div><div class="cards-scroll">${popularSongs.slice(0,10).map(s=>`<div class="section-card" onclick='window.playFromHome(${s.id})'><div class="section-card-img"><img src="/cover/${s.id}" onerror="this.src='data:image/svg+xml...'"></div><div class="section-card-title">${escapeHtml(s.title)}</div><div class="section-card-subtitle">${escapeHtml(s.artist)}</div><div class="song-actions"><span class="like-count"><i class="fas fa-heart"></i> ${s.like_count||0}</span><button class="like-btn-card ${likedStatus.get(s.id)?'liked':''}" onclick="event.stopPropagation(); toggleLikeFromCard(${s.id}, this)"><i class="fas fa-heart"></i></button></div></div>`).join('')}</div>`; 
    let artists = ''; 
    if (topArtists.length) artists = `<div class="section-header"><h2><i class="fas fa-microphone-alt"></i> <span data-i18n="topArtists">${translations[currentLang].topArtists}</span></h2><a onclick="window.goToHomeSubPage('artists')">${translations[currentLang].seeAll} <i class="fas fa-chevron-right"></i></a></div><div class="cards-scroll">${topArtists.map(a=>`<div class="artist-card" onclick="showArtistSongs('${escapeHtml(a.artist)}')"><div class="artist-avatar"><i class="fas fa-user-circle"></i></div><h4>${escapeHtml(a.artist)}</h4><p>${a.playCount} ${currentLang === 'fa' ? 'بار' : 'plays'}</p></div>`).join('')}</div>`; 
    container.innerHTML = forYou + recent + popular + artists; 
}

window.playFromHome = function(sid) { const s = currentSongs.find(x=>x.id===sid); if(s) playSong(s, currentSongs); }

// ========== صفحات فرعی ==========
window.goToHomeSubPage = function(type) {
    window.homeBackStack.push({ type: window.currentHomeSubPageType, page: currentPage });
    window.currentHomeSubPageType = type; currentPage = 1;
    if (type === 'foryou') renderForYouFullPage();
    else if (type === 'recent') renderRecentFullPage();
    else if (type === 'popular') renderPopularFullPage();
    else if (type === 'artists') renderArtistsFullPage();
}

window.goBackToHomeMain = function() {
    if (window.homeBackStack.length > 0) {
        const prev = window.homeBackStack.pop();
        window.currentHomeSubPageType = prev.type; currentPage = prev.page || 1;
        if (prev.type === 'foryou') renderForYouFullPage();
        else if (prev.type === 'recent') renderRecentFullPage();
        else if (prev.type === 'popular') renderPopularFullPage();
        else if (prev.type === 'artists') renderArtistsFullPage();
        else { window.currentHomeSubPageType = null; loadHome(); }
    } else { window.currentHomeSubPageType = null; loadHome(); }
}

function renderHomeBackButton() {
    const container = document.getElementById('dynamic-content');
    if (!container) return;
    const existing = container.querySelector('.back-button-container');
    if (existing) existing.remove();
    if (window.currentHomeSubPageType !== null || (window.homeBackStack && window.homeBackStack.length > 0)) {
        const div = document.createElement('div');
        div.className = 'back-button-container';
        div.innerHTML = `<button class="back-btn" onclick="window.goBackToHomeMain()"><i class="fas fa-arrow-left"></i> <span data-i18n="backToHome">${translations[currentLang].backToHome}</span></button>`;
        container.insertBefore(div, container.firstChild);
    }
}

function renderForYouFullPage() { 
    const start = (currentPage-1)*itemsPerPage, pageSongs = recommendedSongs.slice(start, start+itemsPerPage), total = Math.ceil(recommendedSongs.length/itemsPerPage); 
    let pag = ''; 
    if (total>1) { 
        pag = `<div class="pagination"><button class="page-btn" onclick="goToForYouPage(${currentPage-1})" ${currentPage===1?'disabled':''}><i class="fas fa-chevron-right"></i></button>`; 
        for(let i=1;i<=Math.min(5,total);i++) pag+=`<button class="page-btn ${i===currentPage?'active':''}" onclick="goToForYouPage(${i})">${i}</button>`; 
        pag+=`<button class="page-btn" onclick="goToForYouPage(${currentPage+1})" ${currentPage===total?'disabled':''}><i class="fas fa-chevron-right"></i></button></div>`; 
    } 
    document.getElementById('dynamic-content').innerHTML = `<div class="hero-section"><div class="greeting-section"><h1><i class="fas fa-star"></i> <span data-i18n="forYou">${translations[currentLang].forYou}</span></h1></div><button class="shuffle-btn" onclick="shuffleAllSongs()"><i class="fas fa-random"></i> <span data-i18n="shufflePlay">${translations[currentLang].shufflePlay}</span></button></div><div class="songs-grid" id="fullGrid"></div>${pag}`; 
    renderHomeBackButton(); 
    document.getElementById('fullGrid').innerHTML = pageSongs.map(s=>`<div class="song-card" onclick='window.playFromHome(${s.id})'><div class="song-cover"><img src="/cover/${s.id}" onerror="this.innerHTML='<i class=\'fas fa-music\'></i>'"><div class="play-overlay"><i class="fas fa-play"></i></div></div><h4>${escapeHtml(s.title)}</h4><p>${escapeHtml(s.artist)}</p><div class="song-actions"><span class="like-count"><i class="fas fa-heart"></i> ${s.like_count||0}</span><button class="like-btn-card ${likedStatus.get(s.id)?'liked':''}" onclick="event.stopPropagation(); toggleLikeFromCard(${s.id}, this)"><i class="fas fa-heart"></i></button></div></div>`).join(''); 
}
function goToForYouPage(p) { currentPage = p; renderForYouFullPage(); }
function renderRecentFullPage() { 
    const start = (currentPage-1)*itemsPerPage, pageSongs = newSongs.slice(start, start+itemsPerPage), total = Math.ceil(newSongs.length/itemsPerPage); 
    let pag = ''; 
    if (total>1) { 
        pag = `<div class="pagination"><button class="page-btn" onclick="goToRecentFullPage(${currentPage-1})" ${currentPage===1?'disabled':''}><i class="fas fa-chevron-right"></i></button>`; 
        for(let i=1;i<=Math.min(5,total);i++) pag+=`<button class="page-btn ${i===currentPage?'active':''}" onclick="goToRecentFullPage(${i})">${i}</button>`; 
        pag+=`<button class="page-btn" onclick="goToRecentFullPage(${currentPage+1})" ${currentPage===total?'disabled':''}><i class="fas fa-chevron-right"></i></button></div>`; 
    } 
    document.getElementById('dynamic-content').innerHTML = `<div class="hero-section"><div class="greeting-section"><h1><i class="fas fa-clock"></i> <span data-i18n="newest">${translations[currentLang].newest}</span></h1></div><button class="shuffle-btn" onclick="shuffleAllSongs()"><i class="fas fa-random"></i> <span data-i18n="shufflePlay">${translations[currentLang].shufflePlay}</span></button></div><div class="songs-grid" id="fullGrid"></div>${pag}`; 
    renderHomeBackButton(); 
    document.getElementById('fullGrid').innerHTML = pageSongs.map(s=>`<div class="song-card" onclick='window.playFromHome(${s.id})'><div class="song-cover"><img src="/cover/${s.id}" onerror="this.innerHTML='<i class=\'fas fa-music\'></i>'"><div class="play-overlay"><i class="fas fa-play"></i></div></div><h4>${escapeHtml(s.title)}</h4><p>${escapeHtml(s.artist)}</p><div class="song-actions"><span class="like-count"><i class="fas fa-heart"></i> ${s.like_count||0}</span><button class="like-btn-card ${likedStatus.get(s.id)?'liked':''}" onclick="event.stopPropagation(); toggleLikeFromCard(${s.id}, this)"><i class="fas fa-heart"></i></button></div></div>`).join(''); 
}
function goToRecentFullPage(p) { currentPage = p; renderRecentFullPage(); }
function renderPopularFullPage() { 
    const start = (currentPage-1)*itemsPerPage, pageSongs = popularSongs.slice(start, start+itemsPerPage), total = Math.ceil(popularSongs.length/itemsPerPage); 
    let pag = ''; 
    if (total>1) { 
        pag = `<div class="pagination"><button class="page-btn" onclick="goToPopularFullPage(${currentPage-1})" ${currentPage===1?'disabled':''}><i class="fas fa-chevron-right"></i></button>`; 
        for(let i=1;i<=Math.min(5,total);i++) pag+=`<button class="page-btn ${i===currentPage?'active':''}" onclick="goToPopularFullPage(${i})">${i}</button>`; 
        pag+=`<button class="page-btn" onclick="goToPopularFullPage(${currentPage+1})" ${currentPage===total?'disabled':''}><i class="fas fa-chevron-right"></i></button></div>`; 
    } 
    document.getElementById('dynamic-content').innerHTML = `<div class="hero-section"><div class="greeting-section"><h1><i class="fas fa-fire"></i> <span data-i18n="mostPopular">${translations[currentLang].mostPopular}</span></h1></div><button class="shuffle-btn" onclick="shuffleAllSongs()"><i class="fas fa-random"></i> <span data-i18n="shufflePlay">${translations[currentLang].shufflePlay}</span></button></div><div class="songs-grid" id="fullGrid"></div>${pag}`; 
    renderHomeBackButton(); 
    document.getElementById('fullGrid').innerHTML = pageSongs.map(s=>`<div class="song-card" onclick='window.playFromHome(${s.id})'><div class="song-cover"><img src="/cover/${s.id}" onerror="this.innerHTML='<i class=\'fas fa-music\'></i>'"><div class="play-overlay"><i class="fas fa-play"></i></div></div><h4>${escapeHtml(s.title)}</h4><p>${escapeHtml(s.artist)}</p><div class="song-actions"><span class="like-count"><i class="fas fa-heart"></i> ${s.like_count||0}</span><button class="like-btn-card ${likedStatus.get(s.id)?'liked':''}" onclick="event.stopPropagation(); toggleLikeFromCard(${s.id}, this)"><i class="fas fa-heart"></i></button></div></div>`).join(''); 
}
function goToPopularFullPage(p) { currentPage = p; renderPopularFullPage(); }
function renderArtistsFullPage() { 
    document.getElementById('dynamic-content').innerHTML = `<div class="hero-section"><div class="greeting-section"><h1><i class="fas fa-microphone-alt"></i> <span data-i18n="topArtists">${translations[currentLang].topArtists}</span></h1></div><button class="shuffle-btn" onclick="shuffleAllSongs()"><i class="fas fa-random"></i> <span data-i18n="shufflePlay">${translations[currentLang].shufflePlay}</span></button></div><div class="songs-grid" id="artistsGrid"></div>`; 
    renderHomeBackButton(); 
    const grid = document.getElementById('artistsGrid'); 
    if (!topArtists.length) grid.innerHTML = '<div class="empty-state"><div class="empty-icon-container"><div class="empty-record"></div><i class="fas fa-music empty-note"></i></div><h3>' + ((currentLang === 'fa' ? 'هنوز داده‌ای نیست' : 'No data yet')) + '</h3><p>' + (currentLang === "fa" ? "موردی برای نمایش وجود ندارد." : "Nothing to show here.") + '</p></div>'; 
    else grid.innerHTML = topArtists.map(a=>`<div class="artist-card" onclick="showArtistSongs('${escapeHtml(a.artist)}')"><div class="artist-avatar"><i class="fas fa-user-circle"></i></div><h4>${escapeHtml(a.artist)}</h4><p>${a.playCount} ${currentLang === 'fa' ? 'بار' : 'plays'}</p></div>`).join(''); 
}
function showArtistSongs(artistName) { 
    const songs = currentSongs.filter(s=>s.artist===artistName); 
    const modal = document.createElement('div'); 
    modal.className='artist-modal-overlay'; 
    modal.innerHTML = `<div class="artist-modal-content"><div class="artist-modal-header"><h2><i class="fas fa-user-circle"></i> ${escapeHtml(artistName)}</h2><button class="artist-modal-close" onclick="this.closest('.artist-modal-overlay').remove()"><i class="fas fa-times"></i></button></div><div class="songs-grid" id="artistSongsGrid"></div></div>`; 
    document.body.appendChild(modal); 
    const grid = modal.querySelector('#artistSongsGrid'); 
    grid.innerHTML = songs.map(s=>`<div class="song-card" onclick='window.playFromHome(${s.id}); this.closest(".artist-modal-overlay").remove();'><div class="song-cover"><img src="/cover/${s.id}" onerror="this.innerHTML='<i class=\'fas fa-music\'></i>'"><div class="play-overlay"><i class="fas fa-play"></i></div></div><h4>${escapeHtml(s.title)}</h4><p>${escapeHtml(s.artist)}</p><div class="song-actions"><span class="like-count"><i class="fas fa-heart"></i> ${s.like_count||0}</span><button class="like-btn-card ${likedStatus.get(s.id)?'liked':''}" onclick="event.stopPropagation(); toggleLikeFromCard(${s.id}, this)"><i class="fas fa-heart"></i></button></div></div>`).join(''); 
}
function shuffleAllSongs() { 
    if (!currentSongs.length) { window.showToast(currentLang === 'fa' ? 'آهنگی نیست' : 'No songs', true); return; } 
    const shuffled = [...currentSongs]; 
    for(let i=shuffled.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]; } 
    if(shuffled[0]) playSong(shuffled[0],shuffled); 
}
async function checkLikedStatus(songs) { if(!token) return; for(const s of songs){ try{ const res=await fetch(`/like/status/${s.id}`,{headers:{'Authorization':`Bearer ${token}`}}); if(res.ok) likedStatus.set(s.id,(await res.json()).liked); }catch(e){} } }
async function loadUserPlayHistory() { if(!token) return; try{ const res=await fetch('/user-play-history/',{headers:{'Authorization':`Bearer ${token}`}}); if(res.ok) userPlayHistory=await res.json(); else userPlayHistory=[]; }catch(e){ userPlayHistory=[]; } }
function analyzeTopArtists() { 
    if(!userPlayHistory.length) { topArtists = []; return; } 
    const map=new Map(); 
    for(const p of userPlayHistory) map.set(p.artist,(map.get(p.artist)||0)+1); 
    topArtists=Array.from(map.entries()).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([a,c])=>({artist:a,playCount:c})); 
}// ========== آهنگ‌های من ==========
async function loadMySongs() { 
    if(!token){ document.getElementById('dynamic-content').innerHTML='<div class="hero-section"><div class="greeting-section"><h1><i class="fas fa-microphone-alt"></i> ' + (currentLang === 'fa' ? 'آهنگ‌های من' : 'My Songs') + '</h1></div></div><p>' + (currentLang === 'fa' ? 'وارد شوید' : 'Please login') + '</p>'; return; } 
    document.getElementById('dynamic-content').innerHTML='<div class="hero-section"><div class="greeting-section"><h1><i class="fas fa-microphone-alt"></i> ' + (currentLang === 'fa' ? 'آهنگ‌های من' : 'My Songs') + '</h1></div><button class="shuffle-btn" onclick="shuffleAllSongs()"><i class="fas fa-random"></i> <span data-i18n="shufflePlay">' + translations[currentLang].shufflePlay + '</span></button></div><div class="search-loading"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>'; 
    try{ const res=await fetch('/my-songs/',{headers:{'Authorization':`Bearer ${token}`}}); if(res.status===401){ logout(); return; } let __d3 = await res.json(); mySongs = __d3.items ? __d3.items : __d3; 
    const html=`<div class="hero-section"><div class="greeting-section"><h1><i class="fas fa-microphone-alt"></i> ${currentLang === 'fa' ? 'آهنگ‌های من' : 'My Songs'}</h1><div class="greeting-sub">${currentLang === 'fa' ? 'آهنگ‌هایی که آپلود کرده‌اید' : 'Songs you have uploaded'}</div></div><button class="shuffle-btn" onclick="shuffleAllSongs()"><i class="fas fa-random"></i> ${translations[currentLang].shufflePlay}</button></div><div class="upload-container"><div class="upload-box" id="uploadBox"><i class="fas fa-cloud-upload-alt upload-box-icon"></i><div class="upload-box-title">${currentLang === 'fa' ? 'آهنگتو اینجا بنداز' : 'Drop your song here'}</div><div class="upload-box-sub">${currentLang === 'fa' ? 'کلیک کن / بکش اینجا' : 'Click or drag'}</div></div><input type="file" id="songFileInput" accept=".mp3" style="display:none"><div id="uploadPreviewContainer"></div><div id="uploadMsg"></div></div><div class="songs-container"><div id="mySongsGrid" class="songs-grid"></div><div id="paginationMySongs" class="pagination"></div></div>`; 
    document.getElementById('dynamic-content').innerHTML=html; if(!mySongs.length) document.getElementById('mySongsGrid').innerHTML='<div class="empty-state"><div class="empty-icon-container"><div class="empty-record"></div><i class="fas fa-music empty-note"></i></div><h3>' + ((currentLang === 'fa' ? 'آهنگی آپلود نکرده‌اید' : 'No songs uploaded')) + '</h3><p>' + (currentLang === "fa" ? "موردی برای نمایش وجود ندارد." : "Nothing to show here.") + '</p></div>'; else renderMySongsPaginated(); setupUpload(); }catch(e){ window.showError(); } 
}
function renderMySongsPaginated() { 
    const start=(currentPage-1)*itemsPerPage, pageSongs=mySongs.slice(start, start+itemsPerPage), total=Math.ceil(mySongs.length/itemsPerPage); 
    document.getElementById('mySongsGrid').innerHTML=pageSongs.map(s=>`<div class="song-card"><div class="song-cover" onclick='window.playFromMySongs(${s.id})'><img src="/cover/${s.id}" onerror="this.innerHTML='<i class=\'fas fa-music\'></i>'"><div class="play-overlay"><i class="fas fa-play"></i></div></div><button class="delete-btn" onclick="event.stopPropagation(); window.deleteMySong(${s.id})"><i class="fas fa-trash-alt"></i></button><h4>${escapeHtml(s.title)}</h4><p>${escapeHtml(s.artist)}</p><div class="song-actions"><span class="like-count"><i class="fas fa-heart"></i> ${s.like_count||0}</span><button class="share-btn-card" onclick="event.stopPropagation(); window.shareSong(${s.id},'${escapeHtml(s.title)}','${escapeHtml(s.artist)}')"><i class="fas fa-share-alt"></i></button></div></div>`).join(''); 
    let pag=''; if(total>1){ pag='<div class="pagination">'; if(currentPage>1) pag+=`<button class="page-btn" onclick="goToMySongsPage(${currentPage-1})"><i class="fas fa-chevron-right"></i></button>`; for(let i=1;i<=Math.min(5,total);i++) pag+=`<button class="page-btn ${i===currentPage?'active':''}" onclick="goToMySongsPage(${i})">${i}</button>`; if(currentPage<total) pag+=`<button class="page-btn" onclick="goToMySongsPage(${currentPage+1})"><i class="fas fa-chevron-right"></i></button>`; pag+='</div>'; } document.getElementById('paginationMySongs').innerHTML=pag; 
}
function goToMySongsPage(p){ currentPage=p; renderMySongsPaginated(); }
window.playFromMySongs = function(sid){ const s=mySongs.find(x=>x.id===sid); if(s) playSong(s,mySongs); }
window.deleteMySong = async function(sid){ if(!confirm(currentLang === 'fa' ? 'حذف شود؟' : 'Delete?')) return; try{ const res=await fetch(`/my-song/${sid}`,{method:'DELETE',headers:{'Authorization':`Bearer ${token}`}}); if(res.ok){ window.showToast(currentLang === 'fa' ? 'حذف شد' : 'Deleted'); await loadMySongs(); await loadHome(); if(currentPlayingSong?.id===sid) audio.pause(); } }catch(e){ window.showToast(currentLang === 'fa' ? 'خطا' : 'Error', true); } }
function setupUpload(){ const box=document.getElementById('uploadBox'),input=document.getElementById('songFileInput'); if(box){ box.onclick=()=>input.click(); box.ondragover=e=>{ e.preventDefault(); box.classList.add('drag-over'); }; box.ondragleave=()=>box.classList.remove('drag-over'); box.ondrop=e=>{ e.preventDefault(); box.classList.remove('drag-over'); if(e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files[0]); }; } if(input) input.onchange=e=>{ if(e.target.files.length) handleFileSelect(e.target.files[0]); }; }
function handleFileSelect(file){ if(!file||file.type!=='audio/mpeg'){ window.showToast(currentLang === 'fa' ? 'فایل MP3 معتبر' : 'Valid MP3 file', true); return; } selectedFile=file; const fn=file.name.replace('.mp3',''); const parts=fn.split('-'); let title=fn,artist='Unknown'; if(parts.length>=2){ artist=parts[0].trim(); title=parts.slice(1).join('-').trim(); } document.getElementById('uploadPreviewContainer').innerHTML=`<div class="upload-preview" id="uploadPreview"><div class="preview-info"><div class="preview-cover"><i class="fas fa-music"></i></div><div class="preview-details"><h4>${escapeHtml(title)}</h4><p>${escapeHtml(artist)}</p><p>${(file.size/(1024*1024)).toFixed(2)} MB</p></div></div><div><button class="preview-remove" onclick="cancelUpload()"><i class="fas fa-times"></i></button><button class="btn-submit-upload" id="submitUploadBtn" onclick="submitUpload()"><i class="fas fa-cloud-upload-alt"></i> ${translations[currentLang].upload}</button></div></div>`; }
function cancelUpload(){ selectedFile=null; document.getElementById('uploadPreviewContainer').innerHTML=''; document.getElementById('songFileInput').value=''; }
async function submitUpload(){ if(!token){ window.showToast(currentLang === 'fa' ? 'وارد شوید' : 'Please login', true); return; } if(!selectedFile){ window.showToast(currentLang === 'fa' ? 'فایلی انتخاب نشده' : 'No file selected', true); return; } const fd=new FormData(); fd.append('file',selectedFile); const msg=document.getElementById('uploadMsg'),btn=document.getElementById('submitUploadBtn'); if(btn){ btn.innerHTML='<div class="upload-spinner"></div> ' + translations[currentLang].uploading; btn.disabled=true; } if(msg) msg.innerHTML=translations[currentLang].uploading; try{ const res=await fetch('/upload/',{method:'POST',headers:{'Authorization':`Bearer ${token}`},body:fd}); if(res.ok){ if(msg){ msg.innerHTML=translations[currentLang].uploadSuccess; msg.style.color='#22c55e'; } cancelUpload(); await loadMySongs(); await loadHome(); setTimeout(()=>{ if(msg) msg.innerHTML=''; },2000); }else{ if(msg){ msg.innerHTML=translations[currentLang].uploadError; msg.style.color='#f44336'; } window.showToast(translations[currentLang].uploadError, true); } }catch(e){ if(msg){ msg.innerHTML=translations[currentLang].uploadError; msg.style.color='#f44336'; } window.showToast(translations[currentLang].uploadError, true); }finally{ if(btn){ btn.innerHTML='<i class="fas fa-cloud-upload-alt"></i> ' + translations[currentLang].upload; btn.disabled=false; } } }

// ========== لایک شده‌ها ==========
async function loadLikedSongs() { 
    if(!token){ document.getElementById('dynamic-content').innerHTML='<div class="hero-section"><div class="greeting-section"><h1><i class="fas fa-heart"></i> ' + translations[currentLang].liked + '</h1></div></div><p>' + (currentLang === 'fa' ? 'وارد شوید' : 'Please login') + '</p>'; return; } 
    document.getElementById('dynamic-content').innerHTML='<div class="hero-section"><div class="greeting-section"><h1><i class="fas fa-heart"></i> ' + translations[currentLang].liked + '</h1></div><button class="shuffle-btn" onclick="shuffleAllSongs()"><i class="fas fa-random"></i> ' + translations[currentLang].shufflePlay + '</button></div><div class="search-loading"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>'; 
    try{ const res=await fetch('/liked-songs/',{headers:{'Authorization':`Bearer ${token}`}}); if(res.status===401){ logout(); return; } let __d2 = await res.json(); likedSongs = __d2.items ? __d2.items : __d2; 
    const html=`<div class="hero-section"><div class="greeting-section"><h1><i class="fas fa-heart"></i> ${translations[currentLang].likedSongs}</h1><div class="greeting-sub">${currentLang === 'fa' ? 'آهنگ‌هایی که ❤️ داده‌اید' : 'Songs you have liked'}</div></div><button class="shuffle-btn" onclick="shuffleAllSongs()"><i class="fas fa-random"></i> ${translations[currentLang].shufflePlay}</button></div><div class="songs-container"><div id="likedGrid" class="songs-grid"></div><div id="paginationLiked" class="pagination"></div></div>`; 
    document.getElementById('dynamic-content').innerHTML=html; renderLikedPaginated(); }catch(e){ window.showError(); } 
}
function renderLikedPaginated() { 
    const start=(currentPage-1)*itemsPerPage, pageSongs=likedSongs.slice(start, start+itemsPerPage), total=Math.ceil(likedSongs.length/itemsPerPage); 
    document.getElementById('likedGrid').innerHTML=pageSongs.map(s=>`<div class="song-card" onclick='window.playFromLiked(${s.id})'><div class="song-cover"><img src="/cover/${s.id}" onerror="this.innerHTML='<i class=\'fas fa-music\'></i>'"><div class="play-overlay"><i class="fas fa-play"></i></div></div><h4>${escapeHtml(s.title)}</h4><p>${escapeHtml(s.artist)}</p><div class="song-actions"><span class="like-count"><i class="fas fa-heart"></i> ${s.like_count||0}</span><button class="share-btn-card" onclick="event.stopPropagation(); window.shareSong(${s.id},'${escapeHtml(s.title)}','${escapeHtml(s.artist)}')"><i class="fas fa-share-alt"></i></button></div></div>`).join(''); 
    let pag=''; if(total>1){ pag='<div class="pagination">'; if(currentPage>1) pag+=`<button class="page-btn" onclick="goToLikedPage(${currentPage-1})"><i class="fas fa-chevron-right"></i></button>`; for(let i=1;i<=Math.min(5,total);i++) pag+=`<button class="page-btn ${i===currentPage?'active':''}" onclick="goToLikedPage(${i})">${i}</button>`; if(currentPage<total) pag+=`<button class="page-btn" onclick="goToLikedPage(${currentPage+1})"><i class="fas fa-chevron-right"></i></button>`; pag+='</div>'; } document.getElementById('paginationLiked').innerHTML=pag; 
}
function goToLikedPage(p){ currentPage=p; renderLikedPaginated(); }
window.playFromLiked = function(sid){ const s=likedSongs.find(x=>x.id===sid); if(s) playSong(s,likedSongs); }

// ========== محبوب‌ترین‌ها ==========
async function loadMostLiked() { 
    document.getElementById('dynamic-content').innerHTML='<div class="hero-section"><div class="greeting-section"><h1><i class="fas fa-fire"></i> ' + translations[currentLang].mostPopular + '</h1></div><button class="shuffle-btn" onclick="shuffleAllSongs()"><i class="fas fa-random"></i> ' + translations[currentLang].shufflePlay + '</button></div><div class="search-loading"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>'; 
    try{ const res=await fetch('/most-liked/'); let __d4 = await res.json(); popularSongs = __d4.items ? __d4.items : __d4; 
    const html=`<div class="hero-section"><div class="greeting-section"><h1><i class="fas fa-fire"></i> ${translations[currentLang].mostPopular}</h1><div class="greeting-sub">${currentLang === 'fa' ? 'پرطرفدارترین آهنگ‌ها' : 'Most popular songs'}</div></div><button class="shuffle-btn" onclick="shuffleAllSongs()"><i class="fas fa-random"></i> ${translations[currentLang].shufflePlay}</button></div><div class="songs-container"><div id="popularGrid" class="songs-grid"></div><div id="paginationPopular" class="pagination"></div></div>`; 
    document.getElementById('dynamic-content').innerHTML=html; renderPopularPaginated(); }catch(e){ window.showError(); } 
}
function renderPopularPaginated() { 
    const start=(currentPage-1)*itemsPerPage, pageSongs=popularSongs.slice(start, start+itemsPerPage), total=Math.ceil(popularSongs.length/itemsPerPage); 
    document.getElementById('popularGrid').innerHTML=pageSongs.map(s=>`<div class="song-card" onclick='window.playFromPopular(${s.id})'><div class="song-cover"><img src="/cover/${s.id}" onerror="this.innerHTML='<i class=\'fas fa-music\'></i>'"><div class="play-overlay"><i class="fas fa-play"></i></div></div><h4>${escapeHtml(s.title)}</h4><p>${escapeHtml(s.artist)}</p><div class="song-actions"><span class="like-count"><i class="fas fa-heart"></i> ${s.like_count||0}</span><button class="share-btn-card" onclick="event.stopPropagation(); window.shareSong(${s.id},'${escapeHtml(s.title)}','${escapeHtml(s.artist)}')"><i class="fas fa-share-alt"></i></button></div></div>`).join(''); 
    let pag=''; if(total>1){ pag='<div class="pagination">'; if(currentPage>1) pag+=`<button class="page-btn" onclick="goToPopularPageList(${currentPage-1})"><i class="fas fa-chevron-right"></i></button>`; for(let i=1;i<=Math.min(5,total);i++) pag+=`<button class="page-btn ${i===currentPage?'active':''}" onclick="goToPopularPageList(${i})">${i}</button>`; if(currentPage<total) pag+=`<button class="page-btn" onclick="goToPopularPageList(${currentPage+1})"><i class="fas fa-chevron-right"></i></button>`; pag+='</div>'; } document.getElementById('paginationPopular').innerHTML=pag; 
}
function goToPopularPageList(p){ currentPage=p; renderPopularPaginated(); }
window.playFromPopular = function(sid){ const s=popularSongs.find(x=>x.id===sid); if(s) playSong(s,popularSongs); }        // ========== احراز هویت ==========
        window.showModal = function(mode){ authMode=mode; const m=document.getElementById('auth-modal'); document.getElementById('modalTitle').innerText=mode==='login'? (currentLang === 'fa' ? 'ورود' : 'Login') : (currentLang === 'fa' ? 'ثبت‌نام' : 'Sign Up'); document.getElementById('modalActionBtn').innerText=mode==='login'? (currentLang === 'fa' ? 'ورود' : 'Login') : (currentLang === 'fa' ? 'ثبت‌نام' : 'Sign Up'); document.getElementById('modalUsername').value=''; document.getElementById('modalPassword').value=''; document.getElementById('modalMsg').innerText=''; m.classList.add('active'); }
        window.closeModal = function(){ document.getElementById('auth-modal').classList.remove('active'); }
        window.handleAuth = async function(){ const un=document.getElementById('modalUsername').value, pw=document.getElementById('modalPassword').value, msg=document.getElementById('modalMsg'); if(!un||!pw){ msg.innerText= currentLang === 'fa' ? 'پر کنید' : 'Fill all fields'; return; } try{ const url=authMode==='login'?'/login':'/register'; const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:un,password:pw})}); const data=await res.json(); if(res.ok){ token=data.access_token; localStorage.setItem('user_token',token); localStorage.setItem('username',un); window.closeModal(); showLoggedInUser(un); await window.switchView('home'); }else{ msg.innerText=data.detail || (currentLang === 'fa' ? 'خطا' : 'Error'); } }catch(e){ msg.innerText='Error: '+e.message; } }
        function showLoggedInUser(name){ document.getElementById('auth-buttons').style.display='none'; document.getElementById('user-info').style.display='flex'; document.getElementById('username-display').innerText=name; }
        window.logout = function(){ localStorage.removeItem('user_token'); localStorage.removeItem('username'); token=null; audio.pause(); document.getElementById('nowPlayingBar').style.display='none'; document.getElementById('auth-buttons').style.display='flex'; document.getElementById('user-info').style.display='none'; window.homeBackStack=[]; window.currentHomeSubPageType=null; window.switchView('home'); }
        
        window.switchView = async function(view, param){ 
            currentPage=1; window.closeMobileMenu(); 
            if(view==='home'){ currentView='home'; await loadHome(); history.pushState({ view: 'home_main' }, "", "#home"); }
            else if(view==='mysongs'){ currentView='mysongs'; await loadMySongs(); history.pushState({ view: 'mysongs' }, "", "#mysongs"); }
            else if(view==='liked'){ currentView='liked'; await loadLikedSongs(); history.pushState({ view: 'liked' }, "", "#liked"); }
            else if(view==='popular'){ currentView='popular'; await loadMostLiked(); history.pushState({ view: 'popular' }, "", "#popular"); }
            else if(view==='playlists'){ currentView='playlists'; await loadPlaylistsView(); history.pushState({ view: 'playlists' }, "", "#playlists"); }
            else if(view==='audius'){ currentView='audius'; await window.loadAudiusView(); history.pushState({ view: 'audius' }, "", "#audius"); }
            else if(view==='playlist_detail'){ currentView='playlist_detail'; await loadPlaylistDetail(param); history.pushState({ view: 'playlist_detail', id: param }, "", "#playlist_"+param); }
            document.querySelectorAll('.sidebar .nav li a').forEach(a=>a.classList.remove('active')); 
            if(view==='home') document.querySelector('.sidebar .nav li:first-child a')?.classList.add('active'); 
            else if(view==='mysongs') document.querySelector('.sidebar .nav li:nth-child(2) a')?.classList.add('active'); 
            else if(view==='liked') document.querySelector('.sidebar .nav li:nth-child(3) a')?.classList.add('active'); 
            else if(view==='popular') document.querySelector('.sidebar .nav li:nth-child(4) a')?.classList.add('active'); 
            else if(view==='playlists' || view==='playlist_detail') document.querySelector('.sidebar .nav li:nth-child(5) a')?.classList.add('active'); 
            else if(view==='audius') document.querySelector('.sidebar .nav li:nth-child(6) a')?.classList.add('active'); 
        }
        
        window.handleSearch = async function(){ const query=document.getElementById('global-search')?.value.trim().toLowerCase(); if(currentView!=='home' || window.currentHomeSubPageType) return; if(!query){ renderHomeSections(); return; } const filtered=currentSongs.filter(s=>s.title.toLowerCase().includes(query)||s.artist.toLowerCase().includes(query)); const container=document.getElementById('homeSectionsContainer'); if(!filtered.length) container.innerHTML=`<div class="empty-state"><div class="empty-icon-container"><div class="empty-record"></div><i class="fas fa-search empty-note"></i></div><h3>${currentLang === 'fa' ? 'نتیجه‌ای یافت نشد' : 'No results found'}</h3><p>${currentLang === 'fa' ? 'با کلمات دیگری امتحان کنید.' : 'Try different keywords.'}</p></div>`; else container.innerHTML=`<div class="section-header"><h2><i class="fas fa-search"></i> ${currentLang === 'fa' ? 'نتایج' : 'Results'} (${filtered.length})</h2></div><div class="cards-scroll">${filtered.map(s=>`<div class="section-card" onclick='window.playFromHome(${s.id})'><div class="section-card-img"><img src="/cover/${s.id}" onerror="this.src='data:image/svg+xml...'"></div><div class="section-card-title">${escapeHtml(s.title)}</div><div class="section-card-subtitle">${escapeHtml(s.artist)}</div><div class="song-actions"><span class="like-count"><i class="fas fa-heart"></i> ${s.like_count||0}</span><button class="like-btn-card ${likedStatus.get(s.id)?'liked':''}" onclick="event.stopPropagation(); toggleLikeFromCard(${s.id}, this)"><i class="fas fa-heart"></i></button></div></div>`).join('')}</div>`; }
        
        window.shareSong = function(id,title,artist){ navigator.clipboard.writeText(`${location.origin}/shared-song/${id}`); window.showToast(`"${title}" ${currentLang === 'fa' ? 'لینک کپی شد!' : 'link copied!'}`); }
        window.showError = function(){ document.getElementById('dynamic-content').innerHTML='<div class="hero-section"><div class="greeting-section"><h1>' + (currentLang === 'fa' ? 'خطا' : 'Error') + '</h1></div></div><p style="color:red;">' + (currentLang === 'fa' ? 'مشکل در ارتباط با سرور' : 'Server connection error') + '</p>'; }
        function escapeHtml(t){ if(!t) return ''; return t.replace(/[&<>]/g,m=>{ if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m;}); }
        window.showToast = function(msg,isError){ const t=document.getElementById('toast'); t.innerText=msg; t.style.display='block'; t.style.borderLeftColor=isError?'#f44336':'var(--accent-color)'; setTimeout(()=>{ t.style.display='none'; },2000); }
        
        
        


        // ========== مدیریت دکمه Back مرورگر ==========
        window.addEventListener('popstate', function(event) {
            if (event.state && event.state.view === 'home_main') {
                if (window.currentHomeSubPageType !== null) {
                    window.currentHomeSubPageType = null;
                    window.homeBackStack = [];
                    loadHome();
                }
            } else if (event.state && event.state.view === 'home_sub') {
                if (window.homeBackStack && window.homeBackStack.length > 0) {
                    const prev = window.homeBackStack.pop();
                    window.currentHomeSubPageType = prev.type;
                    currentPage = prev.page || 1;
                    if (prev.type === 'foryou') renderForYouFullPage();
                    else if (prev.type === 'recent') renderRecentFullPage();
                    else if (prev.type === 'popular') renderPopularFullPage();
                    else if (prev.type === 'artists') renderArtistsFullPage();
                    else { window.currentHomeSubPageType = null; loadHome(); }
                }
            } else {
                if (currentView !== 'home' || window.currentHomeSubPageType !== null) {
                    window.switchView('home');
                }
            }
        });
        
        // ========== راه اندازی اولیه ==========
        function init() {
            loadTheme();
            setTimeout(()=>hidePageLoader(),500);
            if(token && username) showLoggedInUser(username);
            loadPlaylistsSidebar();
            window.switchView('home');
            audio.addEventListener('timeupdate', updateProgress);
            audio.addEventListener('play', ()=>{ isPlaying=true; updatePlayButtonUI(); });
            audio.addEventListener('pause', ()=>{ isPlaying=false; updatePlayButtonUI(); });
            audio.addEventListener('ended', ()=>{ window.nextSong(); });
            audio.volume = 0.7;
            setLanguage(localStorage.getItem('language') || 'fa');
        }
        
        window.currentHomeSubPageType = null;
        window.homeBackStack = [];
        init();
    