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

    if (this.forms === undefined) {
      // Process semantics to make forms
      this.forms = [];
      for (var i = 0; i < this.params.interactions.length; i++) {
        this.processInteraction(i);
      }
    }

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
      that.IV.positionLabel(that.dnb.dnd.$element);
      var params = that.params.interactions[that.dnb.dnd.$element.data('id')];
      params.x = x;
      params.y = y;
    };

    this.dnb.dnd.releaseCallback = function () {
      if (that.IV.playing) {
        that.IV.play(true);
      }
      that.IV.$overlay.removeClass('h5p-visible');

      // Edit element when it is dropped.
      if (that.dnb.newElement) {
        that.dnb.dnd.$element.dblclick();
      }
    };

    this.dnb.attach(this.$bar);
  };

  /**
   * Create form for interaction.
   *
   * @param {type} index
   * @returns {undefined}
   */
  InteractiveVideoEditor.prototype.processInteraction = function (index) {
    if (this.children[index] === undefined) {
      this.children[index] = [];
    }
    var tmpChildren = this.children;

    var $form = H5P.jQuery('<div></div>');
    H5PEditor.processSemanticsChunk(this.field.fields[0].field.fields, this.params.interactions[index], $form, this);
    $form.children('.library:first').children('label, select').hide().end().children('.libwrap').css('margin-top', '0');

    tmpChildren[index] = this.children;
    this.children = tmpChildren;

    this.forms[index] = $form;
  };

  /**
   * Called when rendering a new interaction.
   *
   * @param {jQuery} $interaction
   * @returns {undefined}
   */
  InteractiveVideoEditor.prototype.newInteraction = function ($interaction) {
    var that = this;

    if (that.dnb !== undefined) {
      that.dnb.add($interaction);
    }

    $interaction.mousedown(function (event) {
      that.IV.$overlay.addClass('h5p-visible');
      if (that.dnb !== undefined && that.IV.currentState === 1) {
        that.IV.video.pause();
      }
    }).dblclick(function () {
      var id = $interaction.data('id');
      var $form = that.forms[id];
      that.IV.$dialog.children('.h5p-dialog-inner').html('<div class="h5p-dialog-interaction"></div>').children().append($form);

      that.IV.showDialog();

      // Add dialog buttons
      that.IV.$dialog.children('.h5p-dialog-hide').hide();
      var $doneButton = $('<a href="#" class="h5p-button h5p-done">' + t('done') + '</a>')
        .click(function () {
          // Need to do this before validDialog is run. (Hence it is not in the hideDialog function)
          if (H5PEditor.Html) {
            H5PEditor.Html.removeWysiwyg();
          }
          if (that.validDialog(id)) {
            that.hideDialog();
          }
          that.IV.addSliderInteractions();
          return false;
        });

      var $removeButton = $('<a href="#" class="h5p-button h5p-remove">' + t('remove') + '</a>')
        .click(function () {
          // Need to do this before validDialog is run. (Hence it is not in the hideDialog function)
          if (H5PEditor.Html) {
            H5PEditor.Html.removeWysiwyg();
          }
          if (confirm(t('removeInteraction'))) {
            that.removeInteraction(id);
            that.hideDialog();
          }
          that.IV.addSliderInteractions();
          return false;
        });

      var $buttons = $('<div class="h5p-dialog-buttons"></div>')
        .append($doneButton)
        .append($removeButton)
        .appendTo(that.IV.$dialog);

      // Make room for buttons
      var $content = that.IV.$dialog.children('.h5p-dialog-inner');
      var fontSize = parseFloat($content.css('fontSize'));
      $content.css({
        height: (($content.height() / fontSize) - ($buttons.height() / fontSize)) + 'em',
        width: '100%'
      });
    });
  };

  /**
   * Validate the current dialog to see if it can be closed.
   *
   * @param {Integer} id Dialog index.
   * @returns {Boolean}
   */
  InteractiveVideoEditor.prototype.validDialog = function (id) {
    var valid = true;
    var elementKids = this.children[id];
    for (var i = 0; i < elementKids.length; i++) {
      if (elementKids[i].validate() === false) {
        valid = false;
      }
    }

    if (valid) {
      this.forms[id].detach();

      // Remove old visible
      this.IV.visibleInteractions[id].remove();
      delete this.IV.visibleInteractions[id];

      // Check if we should show again
      this.IV.toggleInteraction(id);

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
  InteractiveVideoEditor.prototype.removeInteraction = function (id) {
    this.forms.splice(id, 1);
    this.params.interactions.splice(id, 1);
    H5PEditor.removeChildren(this.children[id]);
    this.children.splice(id, 1);
    this.IV.visibleInteractions[id].remove();
    this.IV.visibleInteractions.splice(id, 1);

    // Update ids
    for (var i = 0; i < this.params.interactions.length; i++) {
      if (this.IV.visibleInteractions[i] !== undefined) {
        this.IV.visibleInteractions[i].data('id', i);
      }
    }

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
        if (that.IV.playing) {
          that.IV.pause(true);
        }

        var from = Math.floor(that.IV.video.getCurrentTime());
        var to = from + 10;
        var duration = Math.floor(that.IV.video.getDuration());
        var interaction = {
          action: {
            library: library.uberName,
            params: {}
          },
          x: 0,
          y: 0,
          duration: {
            from: from,
            to: to > duration ? duration : to
          }
        };

        if (interaction.action.library === 'H5P.Nil 1.0') {
          interaction.label = 'Lorem ipsum dolor sit amet...';
        }

        that.IV.$overlay.addClass('h5p-visible');

        that.params.interactions.push(interaction);
        var i = that.params.interactions.length - 1;
        that.processInteraction(i);
        return that.IV.toggleInteraction(i, from);
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
