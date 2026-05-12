import re

file_path = r'g:\project\music_project\backend\frontend\index.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace HTML
old_html = '''              <div class="mini-player-controls">
                  <button onclick="window.togglePlay(); event.stopPropagation()" id="playPauseMini"><i class="fas fa-play"></i></button>
              </div>'''
new_html = '''              <div class="mini-player-controls">
                  <button onclick="window.previousSong(); event.stopPropagation()" id="prevMini" class="secondary"><i class="fas fa-step-backward"></i></button>
                  <button onclick="window.togglePlay(); event.stopPropagation()" id="playPauseMini"><i class="fas fa-play"></i></button>
                  <button onclick="window.nextSong(); event.stopPropagation()" id="nextMini" class="secondary"><i class="fas fa-step-forward"></i></button>
              </div>'''
content = content.replace(old_html, new_html)

# Add mobile CSS for mini-player-controls gap
css_hook = '.now-playing-bar { height: 75px; padding-bottom: 5px; }'
new_css = '.now-playing-bar { height: 75px; padding-bottom: 5px; }\n              .mini-player-controls { gap: 12px !important; }'
content = content.replace(css_hook, new_css)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
