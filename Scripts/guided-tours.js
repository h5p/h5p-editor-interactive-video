H5PEditor.InteractiveVideo.GuidedTours = (function ($) {
  /**
   * Defines the different tours in IV
   * @type {Array}
   */
  var tours = [
    // Upload video tab
    {
      steps: [
        {
          text: '<p>This guide tours you through the most important features of the Interactive Video editor</p><p>Press EXIT to skip this tour</p><p>Start this guide by pressing the Tour button in the top right corner</p>',
          attachTo: {element: '.field.wizard .h5peditor-label', on: 'bottom'},
          noArrow: true,
          classes: 'h5p-editor-iv-guide-intro'
        },
        {
          title: 'Adding video',
          text: '<p>Start by adding a video file. You can upload a file from your computer or embed a video from YouTube.</p><p>To ensure compatibility across browsers, you can upload multiple file formats of the same video, such as mp4 as webm</p>',
          attachTo: {element: '.field.video .file', on: 'left'},
          highlightElement: true
        },
        {
          title: 'Adding interactions',
          text: '<p>Once you have added a video, you can start adding interactions</p><p>Press the <em>Add interactions</em> tab to get started</p>',
          attachTo: {element: '.h5peditor-tab-assets', on: 'bottom'},
          highlightElement: true
        }
      ],
      options: {
        id: 'h5p-editor-interactive-video-initial-v1'
      }
    },
    // Interactions tab
    {
      steps: [
        {
          title: 'Adding interactions',
          text: 'To add an interaction, drag an element from the toolbar and drop it onto the video',
          attachTo: {element: '.h5peditor-dragnbar', on: 'bottom'},
          highlightElement: true
        },
        {
          title: 'Editing interactions',
          text: '<p>Once an interaction has been added, you can drag to reposition it.</p><p>To resize an interaction, press the lower right corner an drag</p><p>To edit the content of an interaction, double click on it and an editor will appear. You can delete the interaction from within the editor</p>',
          attachTo: {element: '.h5p-video-wrapper', on: 'center'},
          noArrow: true,
          scrollTo: true
        },
        {
          title: 'Bookmarks',
          text: 'You can add bookmarks from the bookmarks menu. Press the bookmark button to open the menu',
          attachTo: {element: '.h5p-control.h5p-bookmarks', on: 'right'},
          highlightElement: true,
          scrollTo: true
        },
        {
          title: 'Preview your video',
          text: 'Press the play button to preview your interactive video during editing',
          attachTo: {element: '.h5p-control.h5p-play', on: 'right'},
          highlightElement: true,
          scrollTo: true
        },
        {
          title: 'Saving and viewing',
          text: "When you're done adding interactions to your video, press Save to view the result",
          attachTo: {element: '.h5p-video-wrapper', on: 'center'},
          noArrow: true,
          scrollTo: true
        },
      ],
      options: {
        id: 'h5p-editor-interactive-video-interactions-v1'
      }
    },
    // Summary tab
    {
      steps: [
        {
          text: 'Say something helpfull about summary here!',
          attachTo: {element: '.h5peditor-tabs', on: 'bottom'},
          noArrow: true
        }
      ],
      options: {
        id: 'h5p-editor-interactive-video-summary-v1'
      }
    }
  ];

  var currentTourId = undefined;

  /**
   * @class H5PEditor.InteractiveVideo.GuidedTours
   */
  function GuidedTours () {}

  /**
   * Starts a guided tour
   *
   * @method GuidedTours.start
   * @static
   * @param  {number} tourId The index of the guide (as defined in the tours array)
   * @param  {boolean} force Force displaying the guide (even if it has been displayed before)
   */
  GuidedTours.start = function (tourId, force) {
    force = force || false;
    
    if ((tourId < 0 || (tourId+1) > tours.length) ||
        (tourId === currentTourId && tours[currentTourId].instance.isOpen())) {
      return;
    }

    // Hide guide if another guide is allready present - only one guide at a time
    if (currentTourId !== undefined) {
      tours[currentTourId].instance.hide();
    }

    var tour = tours[tourId];
    if (tour !== undefined) {
      if (tour.instance === undefined) {
        tour.instance = new H5P.GuidedTour(tour.steps, tour.options);
      }
      if (tour.instance.start(force)) {
        currentTourId = tourId;
      }
    }
  };

  return GuidedTours;
})(H5P.jQuery);
