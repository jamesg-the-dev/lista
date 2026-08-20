# Persist Auth For User

The task is to make sure before the app content loads we the `/api/me` API is called, the response looks like

```
{
    "success": true,
    "data": {
        "managerId": "49a8280a-c880-4388-81ec-91469e92bc71",
        "organisationId": "d19f0d31-de54-4815-a384-af3e9563e50d",
        "name": "James Guerra",
        "email": "jamesguerra2008@gmail.com",
        "venues": [
            {
                "venueId": "d830a547-d6ae-4609-bb7f-40ee238f19dc",
                "name": "Test Venue"
            }
        ]
    },
    "error": null
}
```

The purpose of this is:
1. We can store all this profile information on the client side in a global auth store. We need to store things like name, email, managerId, organisationId, and venues.
2. We can then use this information to pass it through when we move on to integrating the apis.