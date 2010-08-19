$(function() {

/*
 * For a <div class="modal_dialog" id="some_funky_dialog">, ensure that every
 * <a href="link_to_some_funky_dialog"> calls modal_dialog() on it.
 */
$('.modal_dialog').each(function() {
	var $dialog = $(this);
	var dialog_id = $dialog.attr('id');
	$('a.link_to_' + dialog_id).live("click", function(e) {
		$dialog.modal_dialog({ event: e });
		e.preventDefault();
	});
});

$('a.remote_modal_dialog').live('click', function(e) {
  e.preventDefault();
  $.open_remote_modal_dialog($(this).attr('href'));
});

/*
 * If the page was loaded at hash "#modal_dialog:whatever_modal_dialog", open
 * that modal dialog.
 */
var hash_regex = /^#modal_dialog:([-_a-zA-Z0-9]+)$/;
var hash_match = hash_regex.exec(window.location.hash);
if (hash_match) {
	var dialog_id = hash_match[1];
	$('#' + dialog_id).modal_dialog();
	window.location.hash = '#';
}

});
