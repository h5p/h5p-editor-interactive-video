H5PEditor.widgets.interactiveVideo = H5PEditor.InteractiveVideo = (function ($) {

  /**
   * Initialize interactive video editor.
   *
   * @class H5PEditor.InteractiveVideo
   * @param {Object} parent
   * @param {Object} field
   * @param {Object} params
   * @param {function} setValue
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

    this.params = $.extend({
      interactions: [],
      bookmarks: []
    }, params);
    setValue(field, this.params);

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
   */
  InteractiveVideoEditor.prototype.setActive = function () {
    if (this.IV !== undefined) {
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
    this.IV.editor = this;
    for (var i = 0; i < this.IV.interactions.length; i++) {
      this.processInteraction(this.IV.interactions[i], this.params.interactions[i]);
    }
    this.IV.on('controls', function () {
      // Add DragNBar.
      that.$bar = $('<div class="h5peditor-dragnbar">' + t('loading') + '</div>').prependTo(that.$editor);
      var interactions = findField('interactions', that.field.fields);
      var action = findField('action', interactions.field.fields);
      $.post(H5PEditor.ajaxPath + 'libraries', {libraries: action.options}, function (libraries) {
        that.createDragNBar(libraries);
      });

      // Add "Add bookmark" to bookmarks menu.
      $('<a href="#" class="h5p-add-bookmark">' + t('addBookmark') + '</a>').appendTo(that.IV.controls.$bookmarksChooser).click(function () {
        that.addBookmark();
        return false;
      });
    });
    this.IV.on('bookmarkAdded', that.bookmarkAdded, that);
    this.IV.attach(this.$editor);
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
    this.IV.trigger('bookmarksChanged', {'index': i, 'number': 1});

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
   *
   * @param {string} message
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
   *
   * @param {H5P.Event} event
   */
  InteractiveVideoEditor.prototype.bookmarkAdded = function (event) {
    var self = this;
    var $bookmark = event.data.bookmark;

    $('<a class="h5p-remove-bookmark" href="#"></a>')
      .appendTo($bookmark.find('.h5p-bookmark-label'))
      .click(function () {
        var id = $bookmark.data('id');
        self.params.bookmarks.splice(id, 1);
        self.IV.trigger('bookmarksChanged', {'index': id, 'number': -1});
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

      // This is a IE-fix. Without this, text is not shown when editing
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
   * Initialize the toolbar for creating interactivties.
   *
   * @param {Array} libraries
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
      // Hide overlay. (The timeout is needed because of a bug in FF.)
      setTimeout(function () {
        that.IV.$overlay.removeClass('h5p-visible');
      }, 0);

      if (that.IV.lastState !== H5P.Video.PAUSED && that.IV.lastState !== H5P.Video.ENDED) {
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
      that.IV.$overlay.removeClass('h5p-visible');
      that.interaction.setSize(width, height);
    };
  };

  /**
   * Create form for interaction.
   *
   * @param {H5P.InteractiveVideoInteraction} interaction
   * @param {Object} parameters
   */
  InteractiveVideoEditor.prototype.processInteraction = function (interaction, parameters) {
    var self = this;

    // Create form
    interaction.$form = H5P.jQuery('<div/>');
    var interactions = findField('interactions', this.field.fields);

    // Clone semantics to avoid changing them for all interactions
    var interactionFields = H5PEditor.$.extend(true, [], interactions.field.fields);

    // Hide some fields for some interaction types
    var type = interaction.getLibraryName();
    var xAPIQuestionTypes = [
      'H5P.MultiChoice',
      'H5P.SingleChoiceSet',
      'H5P.Blanks',
      'H5P.DragQuestion',
      'H5P.Summary',
      'H5P.MarkTheWords',
      'H5P.DragText'
    ];
    if (xAPIQuestionTypes.indexOf(type) === -1) {
      hideFields(interactionFields, ['adaptivity']);
    }
    if (type === 'H5P.Nil') {
      hideFields(interactionFields, ['displayAsButton']);
    }

    // Create form elements
    H5PEditor.processSemanticsChunk(interactionFields, parameters, interaction.$form, this);

    // Keep track of form elements
    interaction.children = this.children;
    this.children = undefined;

    // Customize form
    interaction.$form.children('.library:first').children('label, select').hide().end().children('.libwrap').css('margin-top', '0');
    self.setLibraryName(interaction.$form, type);

    interaction.on('display', function (event) {
      var $interaction = event.data;
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

    // Find library field instance
    var libraryFieldInstance;
    for (var i = 0; i < interaction.children.length; i++) {
      if (interaction.children[i] instanceof H5PEditor.Library) {
        libraryFieldInstance = interaction.children[i];
      }
    }

    if (libraryFieldInstance) {
      /**
       * Callback for when library changes.
       *
       * @private
       * @param {String} library
       */
      var libraryChange = function () {
        var lib = libraryFieldInstance.currentLibrary.split(' ')[0];
        if (lib !== 'H5P.Image') {
          return;
        }

        /**
         * Callback for when image changes.
         *
         * @private
         * @param {Object} params
         */
        var imageChange = function (newParams) {
          if (newParams === undefined || newParams.width === undefined || newParams.height === undefined ) {
            return; // Skip
          }

          // Avoid to small images
          var fontSize = Number(self.IV.$videoWrapper.css('fontSize').replace('px', ''));
          if (newParams.width < fontSize) {
            newParams.width = fontSize;
          }
          if (newParams.height < fontSize) {
            newParams.height = fontSize;
          }

          // Reduce height for tiny images, stretched pixels looks horrible
          var suggestedHeight = newParams.height / fontSize;
          if (suggestedHeight < parameters.height) {
            parameters.height = suggestedHeight;
          }

          // Calculate new width
          parameters.width = (parameters.height * (newParams.width / newParams.height));
        };

        // Add callback to the correct field
        libraryFieldInstance.forEachChild(function (child) {
          if (child.field.name === 'file') {
            child.changes.push(imageChange);
            return true;
          }
        });
      };

      // Add callback
      libraryFieldInstance.changes.push(libraryChange);
      if (libraryFieldInstance.children !== undefined) {
        // Trigger right away
        libraryChange();
      }
    }
  };

  /**
   * Add library name to library form.
   *
   * @param {H5P.jQuery} $form
   *   Interaction view form
   * @param {string} libraryType
   *   Library type, e.g. H5P.Blanks
   */
  InteractiveVideoEditor.prototype.setLibraryName = function ($form, libraryType) {
    var libraryName = libraryType.replace('.', '-').toLowerCase() + '-library';
    var $libraryForm = $form.children('.library');
    $libraryForm.addClass(libraryName);
  };

  /**
   * Called when rendering a new interaction.
   *
   * @param {H5P.InteractiveVideoInteraction} interaction
   * @param {H5P.jQuery} $interaction
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
      if (that.dnb !== undefined && that.currentState !== H5P.Video.PAUSED && that.currentState !== H5P.Video.ENDED) {
        that.IV.video.pause();
      }

      that.interaction = interaction;
    }).dblclick(function () {
      if (that.lastState !== H5P.Video.PAUSED && that.lastState !== H5P.Video.ENDED) {
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
   * @param {H5P.InteractiveVideoInteraction} interaction
   * @returns {boolean}
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
      interaction.remove(true);

      // Recreate content instance
      interaction.reCreate();

      // Check if we should show again
      interaction.toggle(this.IV.video.getCurrentTime());

      this.dnb.blur();
    }

    return valid;
  };

  /**
   * Revert our customization to the dialog.
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
   * @param {number} id
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
   * @param {Array} libraries
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
   * @param {string} library
   * @returns {Object}
   */
  InteractiveVideoEditor.prototype.getButton = function (library) {
    var that = this;
    var id = library.name.split('.')[1].toLowerCase();

    // Determine title
    var title;
    switch (id) {
      case 'summary':
        title = 'statements';
        break;
      case 'nil':
        title = 'label';
        break;
      default:
        title = library.title.toLowerCase();
    }

    return {
      id: id,
      title: t('insertElement', {':type': title }),
      createElement: function () {
        that.IV.video.pause();

        var from = Math.floor(that.IV.video.getCurrentTime());
        var to = from + 10;
        var duration = Math.floor(that.IV.video.getDuration());
        var newInteraction = {
          action: {
            library: library.uberName,
            params: {},
            subContentId: H5P.createUUID()
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

        var lib = library.uberName.split(' ')[0];
        if (lib === 'H5P.Nil') {
          newInteraction.label = 'Lorem ipsum dolor sit amet...';
        }

        that.IV.$overlay.addClass('h5p-visible');

        that.params.interactions.push(newInteraction);
        var i = that.params.interactions.length - 1;
        that.interaction = that.IV.initInteraction(i);
        that.processInteraction(that.interaction, newInteraction);

        return that.interaction.toggle(from);
      }
    };
  };

  /**
   * Set new video params and remove old player.
   *
   * @param {Object} files
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
   * @param {H5P.jQuery} $wrapper
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
   * @returns {string}
   */
  InteractiveVideoEditor.prototype.createHtml = function () {
    return H5PEditor.createItem(this.field.widget, '<div class="h5peditor-interactions">' + t('selectVideo') + '</div>');
  };

  /**
   * Validate the current field.
   *
   * @returns {boolean}
   */
  InteractiveVideoEditor.prototype.validate = function () {
    return true; // An interactive video is always valid :-)
  };

  /**
   * Remove this item.
   */
  InteractiveVideoEditor.prototype.remove = function () {
    this.$item.remove();
  };

  /**
   * Collect functions to execute once the tree is complete.
   *
   * @param {function} ready
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
   * @param {string} key
   * @param {Object} vars Placeholders
   * @returns {string}
   */
  var t = function (key, vars) {
    return H5PEditor.t('H5PEditor.InteractiveVideo', key, vars);
  };

  /**
   * Look for field with the given name in the given collection.
   *
   * @private
   * @param {string} name of field
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

  /**
   * Hide the given fields from the given form.
   *
   * @private
   * @param {Array} interactionFields to be form
   * @param {Array} fields to hide
   */
  var hideFields = function (interactionFields, fields) {
    // Find and hide fields in list
    for (var i = 0; i < fields.length; i++) {
      var field = findField(fields[i], interactionFields);
      if (field) {
        field.widget = 'none';
      }
    }
  };

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
