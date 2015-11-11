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
          text: H5PEditor.InteractiveVideo.t('tourStepUploadIntroText'),
          attachTo: {element: '.field.wizard .h5peditor-label', on: 'bottom'},
          noArrow: true,
          classes: 'h5p-editor-iv-guide-intro'
        },
        {
          title: H5PEditor.InteractiveVideo.t('tourStepUploadFileTitle'),
          text: H5PEditor.InteractiveVideo.t('tourStepUploadFileText'),
          attachTo: {element: '.field.video .file', on: 'left'},
          highlightElement: true
        },
        {
          title: H5PEditor.InteractiveVideo.t('tourStepUploadAddInteractionsTitle'),
          text: H5PEditor.InteractiveVideo.t('tourStepUploadAddInteractionsText'),
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
          title: H5PEditor.InteractiveVideo.t('tourStepCanvasToolbarTitle'),
          text: H5PEditor.InteractiveVideo.t('tourStepCanvasToolbarText'),
          attachTo: {element: '.h5peditor-dragnbar', on: 'bottom'},
          highlightElement: true
        },
        {
          title: H5PEditor.InteractiveVideo.t('tourStepCanvasEditingTitle'),
          text: H5PEditor.InteractiveVideo.t('tourStepCanvasEditingText'),
          attachTo: {element: '.h5p-video-wrapper', on: 'center'},
          noArrow: true,
          scrollTo: true
        },
        {
          title: H5PEditor.InteractiveVideo.t('tourStepCanvasBookmarksTitle'),
          text: H5PEditor.InteractiveVideo.t('tourStepCanvasBookmarksText'),
          attachTo: {element: '.h5p-control.h5p-bookmarks', on: 'right'},
          highlightElement: true,
          scrollTo: true
        },
        {
          title: H5PEditor.InteractiveVideo.t('tourStepCanvasPreviewTitle'),
          text: H5PEditor.InteractiveVideo.t('tourStepCanvasPreviewText'),
          attachTo: {element: '.h5p-control.h5p-play', on: 'right'},
          highlightElement: true,
          scrollTo: true
        },
        {
          title: H5PEditor.InteractiveVideo.t('tourStepCanvasSaveTitle'),
          text: H5PEditor.InteractiveVideo.t('tourStepCanvasSaveText'),
          attachTo: {element: '.h5p-video-wrapper', on: 'center'},
          noArrow: true,
          scrollTo: true
        }
      ],
      options: {
        id: 'h5p-editor-interactive-video-interactions-v1'
      }
    },
    // Summary tab
    {
      steps: [
        {
          text: H5PEditor.InteractiveVideo.t('tourStepSummaryText'),
          attachTo: {element: '.h5peditor-tabs', on: 'bottom'},
          noArrow: true
        }
      ],
      options: {
        id: 'h5p-editor-interactive-video-summary-v1'
      }
    }
  ];

  var currentTourId;

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
  GuidedTours.start = function (tourId, force, t) {
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

    // Add labels:
    tour.options.labels = {
      exit: H5PEditor.InteractiveVideo.t('tourButtonExit'),
      done: H5PEditor.InteractiveVideo.t('tourButtonDone'),
      back: H5PEditor.InteractiveVideo.t('tourButtonBack'),
      next: H5PEditor.InteractiveVideo.t('tourButtonNext')
    }

    if (tour !== undefined) {
      if (tour.instance === undefined) {
        tour.instance = new H5P.GuidedTour(tour.steps, tour.options);
      }
      tour.instance.start(force, function () {
        currentTourId = tourId;
      });
    }
  };

  return GuidedTours;
})(H5P.jQuery);
