(function() {
  // Polyfill for Array.prototype.map for really old browsers (just in case)
  if (!Array.prototype.map) {
    Array.prototype.map = function(callback, thisArg) {
      var T, A, k;
      if (this == null) {
        throw new TypeError(' this is null or not defined');
      }
      var O = Object(this);
      var len = O.length >>> 0;
      if (typeof callback !== 'function') {
        throw new TypeError(callback + ' is not a function');
      }
      if (arguments.length > 1) {
        T = thisArg;
      }
      A = new Array(len);
      k = 0;
      while (k < len) {
        var kValue, mappedValue;
        if (k in O) {
          kValue = O[k];
          mappedValue = callback.call(T, kValue, k, O);
          A[k] = mappedValue;
        }
        k++;
      }
      return A;
    };
  }

  // --- Configuration ---
  var config = {
    serverUrl: localStorage.getItem('immich_server_url') || '',
    apiKey: localStorage.getItem('immich_api_key') || ''
  };

  // Ensure protocol is present
  if (config.serverUrl.indexOf('http') !== 0) {
    config.serverUrl = 'http://' + config.serverUrl;
  }

  // --- DOM Elements ---
  var configContainer = document.getElementById('config-container');
  var serverUrlInput = document.getElementById('server-url');
  var apiKeyInput = document.getElementById('api-key');
  var saveConfigBtn = document.getElementById('save-config-btn');

  var slideshowContainer = document.getElementById('slideshow-container');
  var slideshowImage = document.getElementById('slideshow-image');
  var slideshowVideo = document.getElementById('slideshow-video');
  var prevBtn = document.getElementById('prev-btn');
  var playPauseBtn = document.getElementById('play-pause-btn');
  var nextBtn = document.getElementById('next-btn');
  var settingsBtn = document.getElementById('settings-btn');
  var loadingIndicator = document.getElementById('loading-indicator');
  var errorMessage = document.getElementById('error-message');

  // --- State ---
  var images = []; // Array of { id: string, type: 'IMAGE' | 'VIDEO', duration: number }
  var currentIndex = 0;
  var isPlaying = true;
  var slideTimeout = null;
  var slideDuration = 5000; // 5 seconds for images
  var currentBlobUrl = null;

  // --- Helpers ---
  function parseDuration(durationStr) {
    if (!durationStr) return 0;
    // Format usually HH:MM:SS.mmmm or just seconds
    var parts = durationStr.split(':');
    var seconds = 0;
    if (parts.length === 3) {
      seconds = (+parts[0]) * 60 * 60 + (+parts[1]) * 60 + (+parts[2]);
    } else if (parts.length === 2) {
      seconds = (+parts[0]) * 60 + (+parts[1]);
    } else {
      seconds = +durationStr;
    }
    return Math.ceil(seconds * 1000);
  }

  // --- Initialization ---
  function init() {
    if (config.serverUrl && config.apiKey) {
      showSlideshow();
    } else {
      showConfig();
    }
  }

  function showConfig() {
    configContainer.style.display = 'block';
    slideshowContainer.style.display = 'none';
    serverUrlInput.value = config.serverUrl;
    apiKeyInput.value = config.apiKey;
    stopSlideshow();
  }

  function showSlideshow() {
    configContainer.style.display = 'none';
    slideshowContainer.style.display = 'flex';
    fetchAssets();
  }

  // --- Logic ---

  function fetchAssets() {
    // Only show loading if we are starting fresh (empty list)
    if (images.length === 0) {
        loadingIndicator.style.display = 'block';
        clearMedia();
    }
    
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';

    var xhr = new XMLHttpRequest();
    // Use Random Search Endpoint
    var url = config.serverUrl.replace(/\/$/, '') + '/api/search/random'; 
    
    xhr.open('POST', url, true);
    xhr.setRequestHeader('x-api-key', config.apiKey);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onload = function() {
      loadingIndicator.style.display = 'none';
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var response = JSON.parse(xhr.responseText);
          // Random endpoint returns an Array directly
          var assets = Array.isArray(response) ? response : [];
          
          console.log('Found ' + assets.length + ' random assets.');

          if (assets.length === 0) {
             showError('No assets found.');
             return;
          }

          var newImages = assets.map(function(asset) {
            return {
              id: asset.id,
              type: asset.type, // 'IMAGE' or 'VIDEO'
              duration: parseDuration(asset.duration)
            };
          });

          // Replace list with new random batch
          images = newImages;
          currentIndex = 0;
          
          // If we were playing (or just starting), show the first image of the new batch
          if (isPlaying) {
             showImage(currentIndex);
             playPauseBtn.textContent = 'Pause';
          }

        } catch (e) {
          showError('Failed to parse response: ' + e.message);
        }
      } else {
        showError('Failed to load assets. Status: ' + xhr.status);
      }
    };

    xhr.onerror = function() {
      loadingIndicator.style.display = 'none';
      showError('Network error occurred.');
    };

    // Request 100 random assets with people data
    xhr.send(JSON.stringify({ size: 100, withPeople: true }));
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.style.display = 'block';
  }

  slideshowImage.onload = function() {
      console.log('Image element loaded successfully: ' + slideshowImage.src);
      errorMessage.style.display = 'none'; // Clear errors on success
  };

  slideshowImage.onerror = function() {
      var msg = 'Error loading image (onerror): ' + slideshowImage.src;
      console.error(msg);
      showError(msg);
  };

  // --- Media Display Logic ---

  function clearMedia() {
    // Stop any existing timeout
    if (slideTimeout) {
      clearTimeout(slideTimeout);
      slideTimeout = null;
    }
    
    // Stop/Hide Video
    slideshowVideo.pause();
    slideshowVideo.removeAttribute('src'); // Clear source
    slideshowVideo.load();
    slideshowVideo.style.display = 'none';
    
    // Hide/Clear Image
    slideshowImage.style.display = 'none';
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
      currentBlobUrl = null;
    }
    slideshowImage.removeAttribute('src');
  }

  function showImage(index) {
    // Check for end of list -> Refetch
    if (index >= images.length) {
        if (images.length > 0) {
            console.log('End of list reached. Refetching random assets...');
            images = []; 
            fetchAssets();
            return;
        } else {
            return; 
        }
    }
    
    // Loop back if manually going previous from 0
    if (index < 0) {
        if (images.length > 0) index = images.length - 1;
        else return;
    }

    currentIndex = index;

    var asset = images[currentIndex];
    clearMedia(); // Reset state

    if (asset.type === 'VIDEO') {
        playVideo(asset);
    } else {
        displayImage(asset);
    }
  }

  function playVideo(asset) {
    console.log('Playing Video: ' + asset.id + ' (Duration: ' + asset.duration + 'ms)');
    slideshowVideo.style.display = 'block';
    
    var url = config.serverUrl.replace(/\/$/, '') + '/api/assets/' + asset.id + '/video/playback?apiKey=' + config.apiKey;
    
    slideshowVideo.src = url;
    
    // Auto-advance when ended
    slideshowVideo.onended = function() {
        console.log('Video ended normally.');
        if (isPlaying) {
            nextImage();
        }
    };

    slideshowVideo.onerror = function() {
        console.error('Error playing video: ' + asset.id);
        // If error, wait a moment then skip
        if (isPlaying) {
            // Ensure we don't have double nextImage calls if safety timeout also fires
            if (slideTimeout) clearTimeout(slideTimeout);
            slideTimeout = setTimeout(nextImage, 2000);
        }
    };

    // Safety Timeout: Duration + Margin
    if (isPlaying) {
        // Use parsed duration + 5s margin, or default 30s if duration missing
        var safetyTime = (asset.duration > 0 ? asset.duration : 30000) + 5000;
        console.log('Setting safety timeout for video: ' + safetyTime + 'ms');
        slideTimeout = setTimeout(function() {
            console.warn('Video safety timeout reached. Skipping...');
            nextImage();
        }, safetyTime);
    }

    var playPromise = slideshowVideo.play();
    if (playPromise !== undefined) {
        playPromise.catch(function(error) {
            console.warn('Auto-play prevented:', error);
        });
    }
  }

  function displayImage(asset) {
    console.log('Displaying Image: ' + asset.id);
    slideshowImage.style.display = 'block'; // Make sure it's visible

    var url = config.serverUrl.replace(/\/$/, '') + '/api/assets/' + asset.id + '/thumbnail?size=preview';

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    xhr.setRequestHeader('x-api-key', config.apiKey);
    xhr.setRequestHeader('Accept', 'image/jpeg, image/png, */*');

    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        var blob = xhr.response;
        currentBlobUrl = URL.createObjectURL(blob);
        slideshowImage.src = currentBlobUrl;
        
        // Start timer only after successful load
        if (isPlaying) {
            slideTimeout = setTimeout(nextImage, slideDuration);
        }
      } else {
        console.error('Failed to load image. Status: ' + xhr.status);
        // Skip on error
        if (isPlaying) {
            slideTimeout = setTimeout(nextImage, 1000); 
        }
      }
    };

    xhr.onerror = function() {
      console.error('Network error loading image.');
      if (isPlaying) {
          slideTimeout = setTimeout(nextImage, 1000);
      }
    };

    xhr.send();
  }

  function nextImage() {
    showImage(currentIndex + 1);
  }

  function prevImage() {
    showImage(currentIndex - 1);
  }

  function startSlideshow() {
    if (intervalId) clearInterval(intervalId); // Clear old intervals (not used anymore)
    playPauseBtn.textContent = 'Pause';
    isPlaying = true;
    
    // Resume current item processing
    var asset = images[currentIndex];
    if (asset && asset.type === 'VIDEO') {
        slideshowVideo.play();
        // Re-set safety timeout logic if needed, but playVideo handles initial call. 
        // If resuming a paused video, onended/timeout are already set/cleared.
        // Complex to handle perfectly without fuller state machine, 
        // but hitting Play will unpause HTML5 video element.
        // We might need to re-set the safety timeout if it was cleared on stop.
        // For simplicity: just let play() handle it, if it stalls, user hits next.
    } else {
        // If image, just go next to restart flow
        nextImage();
    }
  }

  function stopSlideshow() {
    isPlaying = false;
    playPauseBtn.textContent = 'Play';
    if (slideTimeout) clearTimeout(slideTimeout);
    slideshowVideo.pause();
  }

  function togglePlayPause() {
    if (isPlaying) {
      stopSlideshow();
    } else {
      startSlideshow(); // This now just sets isPlaying and resumes or skips
    }
  }

  // --- Event Handlers ---

  saveConfigBtn.addEventListener('click', function() {
    var url = serverUrlInput.value.trim();
    var key = apiKeyInput.value.trim();

    if (!url || !key) {
      alert('Please enter both Server URL and API Key');
      return;
    }

    // Basic URL validation/correction
    if (url.indexOf('http') !== 0) {
        url = 'http://' + url;
    }

    config.serverUrl = url;
    config.apiKey = key;

    localStorage.setItem('immich_server_url', config.serverUrl);
    localStorage.setItem('immich_api_key', config.apiKey);

    showSlideshow();
  });

  prevBtn.addEventListener('click', function() {
    stopSlideshow(); // Stop auto-play on manual interaction
    prevImage();
  });

  nextBtn.addEventListener('click', function() {
    stopSlideshow(); // Stop auto-play on manual interaction
    nextImage();
  });

  playPauseBtn.addEventListener('click', togglePlayPause);

  settingsBtn.addEventListener('click', showConfig);

  // Start
  init();

})();