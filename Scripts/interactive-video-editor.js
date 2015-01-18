var H5PEditor = H5PEditor || {};

/**
 * Interactive Video editor widget module
 *
 * @param {jQuery} $
 */
H5PEditor.widgets.interactiveVideo = H5PEditor.InteractiveVideo = (function ($) {

  /**
   * Initialize interactive video editor.
   *
   * @param {Object} parent
   * @param {Object} field
   * @param {Object} params
   * @param {function} setValue
   * @returns {_L8.C}
   */
  function InteractiveVideoEditor(parent, field, params, setValue) {
    var that = this;

    this.parent = parent;
    this.field = field;

    this.findVideoField(function (field) {
      if (field.params !== undefined) {
        that.setVideo(field.params);
      }

      field.changes.push(function (file) {
        that.setVideo(field.params);
      });
    });

    if (params === undefined) {
      this.params = {
        interactions: [],
        bookmarks: []
      };
      setValue(field, this.params);
    }
    else {
      this.params = params;
    }

    this.children = [];

    this.passReadies = true;
    parent.ready(function () {
      that.passReadies = false;
    });
  }

  /**
   * Find the video field to use for the video, then run the callback.
   *
   * @param {function} callback
   * @returns {undefined}
   */
  InteractiveVideoEditor.prototype.findVideoField = function (callback) {
    var that = this;

    // Find field when tree is ready.
    this.parent.ready(function () {
      var videoField = H5PEditor.findField(that.field.video, that.parent);

      if (!videoField) {
        throw H5PEditor.t('core', 'unknownFieldPath', {':path': that.field.video});
      }
      if (videoField.field.type !== 'video') {
        throw t('notVideoField', {':path': that.field.video});
      }

      callback(videoField);
    });
  };

  /**
   * Our tab has been set active. Create a new player if necessary.
   *
   * @returns {unresolved}
   */
  InteractiveVideoEditor.prototype.setActive = function () {
    if (this.IV !== undefined) { // TODO: Check if video is loaded somehow?
      // A video has been loaded, no need to recreate.
      return;
    }

    // Reset css
    this.$editor.css({
      width: '',
      height: '',
      fontSize: ''
    });

    if (this.video === undefined) {
      this.$editor.html(t('selectVideo')).removeClass('h5p-interactive-video');
      return;
    }

    var that = this;

    // Create new player.
    this.IV = new H5P.InteractiveVideo({
      interactiveVideo: {
        video: {
          files: this.video
        },
        assets: this.params
      }
    }, H5PEditor.contentId);
    this.IV.editor = this; // TODO: Remove this and rely on events! (that's how JS is meant to be played)
    this.IV.$.on('bookmarkAdded', function (event, $bookmark) {
      that.bookmarkAdded($bookmark);
    });
    this.IV.attach(this.$editor);

    // Add DragNBar.
    this.$bar = $('<div class="h5peditor-dragnbar">' + t('loading') + '</div>').prependTo(this.$editor);
    var interactions = findField('interactions', this.field.fields);
    var action = findField('action', interactions.field.fields);
    $.post(H5PEditor.ajaxPath + 'libraries', {libraries: action.options}, function (libraries) {
      that.createDragNBar(libraries);
    });

    // Add "Add bookmark" to bookmarks menu.
    $('<a href="#" class="h5p-add-bookmark">' + t('addBookmark') + '</a>').appendTo(that.IV.controls.$bookmarksChooser).click(function () {
      that.addBookmark();
      return false;
    });
  };

  /**
   * Add bookmark
   */
  InteractiveVideoEditor.prototype.addBookmark = function () {
    var time = this.IV.video.getCurrentTime();

    // Find out where to place the bookmark
    for (var i = 0; i < this.params.bookmarks.length; i++) {
      if (this.params.bookmarks[i].time > time) {
        // Insert before this.
        break;
      }
    }

    var tenth = Math.floor(time * 10) / 10;
    if (this.IV.bookmarksMap[tenth] !== undefined) {
      // Create warning:
      this.displayMessage(t('bookmarkAlreadyExists'));
      return; // Not space for another bookmark.
    }

    // Hide dialog
    this.IV.controls.$bookmarksChooser.removeClass('h5p-show');

    // Move other increament other ids.
    this.IV.$.trigger('bookmarksChanged', [i, 1]);

    this.params.bookmarks.splice(i, 0, {
      time: time,
      label: t('newBookmark')
    });

    var $bookmark = this.IV.addBookmark(i, tenth);
    $bookmark.addClass('h5p-show');
    $bookmark.find('.h5p-bookmark-text').click();
  };

  /**
   * Display a popup containing a message.
   */
  InteractiveVideoEditor.prototype.displayMessage = function (message) {
    var timeout;
    var $warning = $('<div/>', {
      'class': 'h5p-iv-message-popup',
      text: message,
      click: function () {
        clearTimeout(timeout);
        $warning.remove();
      }
    }).appendTo(this.$editor);

    timeout = setTimeout(function(){
      $warning.remove();
    }, 3000);
  };

  /**
   * Gets called whenever a bookmark is added to the UI.
   */
  InteractiveVideoEditor.prototype.bookmarkAdded = function ($bookmark) {
    var self = this;

    $('<a class="h5p-remove-bookmark" href="#"></a>')
      .appendTo($bookmark.find('.h5p-bookmark-label'))
      .click(function () {
        var id = $bookmark.data('id');
        self.params.bookmarks.splice(id, 1);
        self.IV.$.trigger('bookmarksChanged', [id, -1]);
        $bookmark.remove();
        return false;
      });

    // Click to edit label.
    $bookmark.find('.h5p-bookmark-text').click(function () {
      if ($bookmark.hasClass('h5p-force-show')) {
        return; // Double click
      }
      $bookmark.addClass('h5p-force-show');
      var $text = $(this);

      /* This is a IE-fix. Without this, text is not shown when editing */
      $text.css({overflow: 'visible'});

      var $input = $text.html('<input type="text" class="h5p-bookmark-input" style="width:' + ($text.width() - 19) + 'px" maxlength="255" value="' + $text.text() + '"/>')
        .children()
        .blur(function () {
          var newText = $input.val();
          if (H5P.trim(newText) === '') {
            newText = t('newBookmark');
          }
          $text.text(newText);
          $bookmark.removeClass('h5p-force-show').mouseover().mouseout();
          $text.css({overflow: 'hidden'});

          var id = $bookmark.data('id');
          self.params.bookmarks[id].label = newText;
          self.IV.controls.$bookmarksChooser.find('li:eq(' + id + ')').text(newText);
        })
        .keydown(function (event) {
          if (event.which === 13) {
            $input.blur();
          }
        })
        .focus();

      if ($input.val() === t('newBookmark')) {
        // Delete default value when editing
        $input.val('');
      }
    });
  };

  /**
   *
   * @param {type} libraries
   * @returns {undefined}
   */
  InteractiveVideoEditor.prototype.createDragNBar = function (libraries) {
    var that = this;

    this.dnb = new H5P.DragNBar(this.getButtons(libraries), this.IV.$videoWrapper);

    // Update params when the element is dropped.
    this.dnb.stopMovingCallback = function (x, y) {
      that.interaction.positionLabel(that.IV.$videoWrapper.width());
      that.interaction.setPosition(x, y);
    };

    this.dnb.dnd.releaseCallback = function () {
      that.IV.$overlay.removeClass('h5p-visible');

      if (that.IV.lastState !== PAUSED && that.IV.lastState !== ENDED) {
        // Resume playing
        that.IV.video.play();
      }

      // Edit element when it is dropped.
      if (that.dnb.newElement) {
        that.dnb.dnd.$element.dblclick();
      }
    };

    this.dnb.attach(this.$bar);

    this.dnr = new H5P.DragNResize(this.IV.$videoWrapper);

    this.dnr.resizeCallback = function (width, height) {
      self.IV.$overlay.removeClass('h5p-visible');
      that.interaction.setSize(width, height);
    };
  };

  /**
   * Create form for interaction.
   *
   * @param {type} index
   * @returns {undefined}
   */
  InteractiveVideoEditor.prototype.processInteraction = function (interaction, parameters) {
    self = this;

    // Create form
    interaction.$form = H5P.jQuery('<div/>');
    var interactions = findField('interactions', this.field.fields);
    H5PEditor.processSemanticsChunk(interactions.field.fields, parameters, interaction.$form, this);

    // Keep track of form elements
    interaction.children = this.children;
    this.children = undefined;

    // Customize form
    interaction.$form.children('.library:first').children('label, select').hide().end().children('.libwrap').css('margin-top', '0');

    interaction.on('display', function ($interaction) {
      // Customize rendering of interaction
      self.newInteraction(interaction, $interaction);

      if (!interaction.isButton()) {
        $('<div/>', {
          'class': 'h5p-interaction-overlay'
        }).appendTo($interaction);
        self.dnr.add($interaction);
        $interaction.children('.h5p-dragnresize-handle').unbind('mousedown').mousedown(function (event) {
          self.interaction = interaction;
          self.IV.$overlay.addClass('h5p-visible');
          self.IV.video.pause();

          self.dnr.$element = $interaction;
          self.dnr.press(event.clientX, event.clientY);

          return false;
        });
      }
    });
  };

  /**
   * Called when rendering a new interaction.
   *
   * @param {jQuery} $interaction
   * @returns {undefined}
   */
  InteractiveVideoEditor.prototype.newInteraction = function (interaction, $interaction) {
    var that = this;

    if (that.dnb !== undefined) {
      that.dnb.add($interaction);
    }

    // Disable the normal dialog
    interaction.dialogDisabled = true;

    $interaction.mousedown(function (event) {
      // Add overlay to prevent the mouse from leaving the current body
      that.IV.$overlay.addClass('h5p-visible');

      // Keep track of last state
      that.IV.lastState = that.IV.currentState;

      // Pause video
      if (that.dnb !== undefined && that.currentState !== PAUSED && that.currentState !== ENDED) {
        that.IV.video.pause();
      }

      that.interaction = interaction;
    }).dblclick(function () {
      if (that.lastState !== PAUSED && that.lastState !== ENDED) {
        // Pause video
        that.IV.video.pause();
      }

      // Add dialog buttons
      var $doneButton = $('<a href="#" class="h5p-button h5p-done">' + t('done') + '</a>')
        .click(function () {
          if (H5PEditor.Html) {
            // Need to do this before form is validated
            H5PEditor.Html.removeWysiwyg();
          }
          if (that.validDialog(interaction)) {
            that.IV.dialog.close();
          }
          that.IV.addSliderInteractions();
          return false;
        });

      var $removeButton = $('<a href="#" class="h5p-button h5p-remove">' + t('remove') + '</a>')
        .click(function () {
          if (H5PEditor.Html) {
            // Need to do this before form is validated
            H5PEditor.Html.removeWysiwyg();
          }
          if (confirm(t('removeInteraction'))) {
            that.removeInteraction(interaction);
            that.IV.dialog.close();
          }
          // TODO: Keep track of dots using the Interaction class
          that.IV.addSliderInteractions();
          return false;
        });

      var $buttons = $('<div class="h5p-dialog-buttons"></div>')
        .append($doneButton)
        .append($removeButton);

      that.IV.dialog.open(interaction.$form, $buttons);
    });
  };

  /**
   * Validate the current dialog to see if it can be closed.
   *
   * @param {} interaction
   * @returns {Boolean}
   */
  InteractiveVideoEditor.prototype.validDialog = function (interaction) {
    var valid = true;
    var elementKids = interaction.children;
    for (var i = 0; i < elementKids.length; i++) {
      if (elementKids[i].validate() === false) {
        valid = false;
      }
    }

    if (valid) {
      // Keep form
      interaction.$form.detach();

      // Remove interaction from display
      interaction.remove();

      // Check if we should show again
      interaction.toggle(this.IV.video.getCurrentTime());

      this.dnb.blur();
    }

    return valid;
  };

  /**
   * Revert our customization to the dialog.
   *
   * @returns {undefined}
   */
  InteractiveVideoEditor.prototype.hideDialog = function () {
    this.IV.hideDialog();
    this.IV.$dialog.children('.h5p-dialog-inner').css({
      height: '',
      width: ''
    });
    this.IV.$dialog.children('.h5p-dialog-hide').show();
    this.IV.$dialog.children('.h5p-dialog-buttons').remove();
  };

  /**
   * Remove interaction from video.
   *
   * @param {Integer} id
   * @returns {undefined}
   */
  InteractiveVideoEditor.prototype.removeInteraction = function (interaction) {
    for (var i = 0; i < this.IV.interactions.length; i++) {
      if (this.IV.interactions[i] === interaction) {
        this.params.interactions.splice(i, 1);
        this.IV.interactions.splice(i, 1);
        break;
      }
    }
    H5PEditor.removeChildren(interaction.children);
    interaction.remove();

    if (this.dnb !== undefined) {
      this.dnb.blur();
    }
  };

  /**
   * Returns buttons for the DragNBar.
   *
   * @returns {Array}
   */
  InteractiveVideoEditor.prototype.getButtons = function (libraries) {
    var buttons = [];
    for (var i = 0; i < libraries.length; i++) {
      if (libraries[i].restricted === undefined || !libraries[i].restricted) {
        buttons.push(this.getButton(libraries[i]));
      }
    }

    return buttons;
  };

  /**
   * Returns button data for the given library.
   *
   * @param {String} library
   * @returns {_L8.InteractiveVideoEditor.prototype.getButton.Anonym$3}
   */
  InteractiveVideoEditor.prototype.getButton = function (library) {
    var that = this;
    var id = library.name.split('.')[1].toLowerCase();

    return {
      id: id,
      title: t('insertElement', {':type': id === 'summary' ? 'statements' : library.title.toLowerCase() }),
      createElement: function () {
        that.IV.video.pause();

        var from = Math.floor(that.IV.video.getCurrentTime());
        var to = from + 10;
        var duration = Math.floor(that.IV.video.getDuration());
        var newInteraction = {
          action: {
            library: library.uberName,
            params: {}
          },
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          duration: {
            from: from,
            to: to > duration ? duration : to
          }
        };

        if (newInteraction.action.library === 'H5P.Nil 1.0') {
          newInteraction.label = 'Lorem ipsum dolor sit amet...';
        }

        that.IV.$overlay.addClass('h5p-visible');

        that.params.interactions.push(newInteraction);
        var i = that.params.interactions.length - 1;
        that.interaction = that.IV.initInteraction(i);

        return that.interaction.toggle(from);
      }
    };
  };

  /**
   * Set new video params and remove old player.
   *
   * @param {Object} files
   * @returns {undefined}
   */
  InteractiveVideoEditor.prototype.setVideo = function (files) {
    this.video = files;

    if (this.IV !== undefined) {
      delete this.IV;
    }
  };

  /**
   * Append field to wrapper.
   *
   * @param {type} $wrapper
   * @returns {undefined}
   */
  InteractiveVideoEditor.prototype.appendTo = function ($wrapper) {
    // Added to support older versions of core. Needed when using IV in CP.
    var $libwrap = $wrapper.parent().parent();
    if ($libwrap.hasClass('libwrap')) {
      $libwrap.addClass('h5p-interactivevideo-editor');
    }

    this.$item = $(this.createHtml()).appendTo($wrapper);
    this.$editor = this.$item.children('.h5peditor-interactions');
    this.$errors = this.$item.children('.h5p-errors');
    this.$bar = this.$item.children('.h5peditor-dragnbar');
  };

  /**
   * Create HTML for the field.
   *
   * @returns {@exp;H5PEditor@call;createItem}
   */
  InteractiveVideoEditor.prototype.createHtml = function () {
    return H5PEditor.createItem(this.field.widget, '<div class="h5peditor-interactions">' + t('selectVideo') + '</div>');
  };

  /**
   * Validate the current field.
   *
   * @returns {Boolean}
   */
  InteractiveVideoEditor.prototype.validate = function () {
    return true;
  };

  /**
   * Remove this item.
   *
   * @returns {undefined}
   */
  InteractiveVideoEditor.prototype.remove = function () {
    this.$item.remove();
  };

  /**
   * Collect functions to execute once the tree is complete.
   *
   * @param {function} ready
   * @returns {undefined}
   */
  InteractiveVideoEditor.prototype.ready = function (ready) {
    if (this.passReadies) {
      this.parent.ready(ready);
    }
    else {
      this.readies.push(ready);
    }
  };

  /**
   * Translate UI texts for this library.
   *
   * @private
   * @param {String} key
   * @param {Object} vars
   * @returns {@exp;H5PEditor@call;t}
   */
  var t = function (key, vars) {
    return H5PEditor.t('H5PEditor.InteractiveVideo', key, vars);
  };

  /**
   * Look for field with the given name in the given collection.
   *
   * @private
   * @param {String} name of field
   * @param {Array} fields collection to look in
   * @returns {Object} field object
   */
  var findField = function (name, fields) {
    for (var i = 0; i < fields.length; i++) {
      if (fields[i].name === name) {
        return fields[i];
      }
    }
  };

  /** @constant {number} */
  var ENDED = 0;
  /** @constant {number} */
  var PLAYING = 1;
  /** @constant {number} */
  var PAUSED = 2;
  /** @constant {number} */
  var BUFFERING = 3;
  /** @constant {number} */
  var SEEKING = 4;

  return InteractiveVideoEditor;
})(H5P.jQuery);

// Default english translations
H5PEditor.language['H5PEditor.InteractiveVideo'] = {
  libraryStrings: {
    selectVideo: 'You must select a video before adding interactions.',
    notVideoField: '":path" is not a video.',
    insertElement: 'Click and drag to place :type',
    popupTitle: 'Edit :type',
    done: 'Done',
    loading: 'Loading...',
    remove: 'Remove',
    removeInteraction: 'Are you sure you wish to remove this interaction?',
    addBookmark: 'Add bookmark',
    newBookmark: 'New bookmark',
    bookmarkAlreadyExists: 'Bookmark already exists here. Move playhead and add a bookmark at another time.'
  }
};
