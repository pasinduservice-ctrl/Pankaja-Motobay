const form =
    document.getElementById(
        "loginForm"
    );


form.addEventListener(
    "submit",
    async (e) => {

        e.preventDefault();


        const email =
            document.getElementById(
                "email"
            ).value;


        const password =
            document.getElementById(
                "password"
            ).value;


        const response =
            await fetch(
                "/api/admin/login",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            email,
                            password
                        })

                }
            );


        const data =
            await response.json();


        if (response.ok) {

            window.location.href =
                "dashboard.html";

        } else {

            document.getElementById(
                "error"
            ).textContent =
                data.error ||
                "Login failed";

        }

    }
);