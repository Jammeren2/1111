$(document).ready(function () {
    /*==================================================================
    [ Validate ]*/
    var input = $('.validate-input .input100');

    $('.validate-form').on('submit', function (event) {
        event.preventDefault(); // Отменяем стандартное действие формы

        var check = true;

        for (var i = 0; i < input.length; i++) {
            if (validate(input[i]) == false) {
                showValidate(input[i]);
                check = false;
            }
        }

        if (check) {
            // Если проверка успешна, отправляем запрос на сервер для проверки авторизации
            var formData = {
                email: $('#email').val().trim(),
                pass: $('#pass').val().trim()
            };

            $.ajax({
                type: 'POST',
                url: '/login',
                data: JSON.stringify(formData),
                contentType: 'application/json',
                success: function (response) {
                    // При успешной авторизации, перенаправляем на dashboard.html
                    window.location.href = '/dashboard';
                },
                error: function (error) {
                    console.error('Error during login:', error);
                    // Ваша логика обработки ошибки
                }
            });
        }

        return check;
    });

    $('.validate-form .input100').each(function () {
        $(this).focus(function () {
            hideValidate(this);
        });
    });

    function validate(input) {
        if ($(input).attr('type') == 'email' || $(input).attr('name') == 'email') {
            // Ваша логика валидации email
            return true;
        } else {
            return $(input).val().trim() !== '';
        }
    }

    function showValidate(input) {
        var thisAlert = $(input).parent();

        $(thisAlert).addClass('alert-validate');
    }

    function hideValidate(input) {
        var thisAlert = $(input).parent();

        $(thisAlert).removeClass('alert-validate');
    }
});
